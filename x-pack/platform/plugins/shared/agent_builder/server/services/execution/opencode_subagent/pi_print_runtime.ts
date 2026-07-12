/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  CodingRunParams,
  CodingRunResult,
  CodingRuntime,
} from './coding_runtime';
import type { OpencodeRunProgress } from './types';

/**
 * pi coding runtime (github.com/earendil-works/pi) — LAYER 2, `print` protocol.
 *
 * Unlike OpenCode, pi does not speak ACP. For the PoC it is driven one-shot per
 * turn: we point pi at the LiteLLM (OpenAI-compatible) gateway via a generated
 * `models.json`, then run `pi --print` inside the sandbox and capture the final
 * answer. This gives a real second runtime (pi actually runs and edits files in
 * the sandbox) without the streaming richness of the ACP driver.
 *
 * pi's richer `--mode rpc`/`--mode json` streaming can replace `--print` later
 * behind the same interface without touching the executor or lifecycle layers.
 */
export class PiPrintRuntime implements CodingRuntime {
  readonly id = 'pi';
  readonly protocol = 'print' as const;

  constructor(private readonly logger: Logger) {}

  async run(params: CodingRunParams): Promise<CodingRunResult> {
    const { sandbox, prompt, modelConfig, systemPrompt, timeoutMs, onProgress } = params;
    const timeline: OpencodeRunProgress[] = [];
    const emit = (p: OpencodeRunProgress) => {
      timeline.push(p);
      onProgress?.(p);
    };

    emit({
      id: 'pi-config',
      phase: 'connecting',
      label: 'Configuring pi (LiteLLM gateway)',
      status: 'in_progress',
    });

    // Point pi's "openai" provider at the LiteLLM base URL via models.json. pi
    // reads ~/.pi/agent/models.json for custom OpenAI-compatible providers.
    const modelsJson = JSON.stringify({
      providers: {
        openai: {
          baseUrl: modelConfig.baseUrl,
          // pi picks the api key up from PI_OPENAI_API_KEY / --api-key; the URL
          // is what it can't infer, so we pin it here.
        },
      },
    });
    const writeConfig = [
      'mkdir -p "$HOME/.pi/agent"',
      `printf '%s' ${shSingleQuote(modelsJson)} > "$HOME/.pi/agent/models.json"`,
    ].join(' && ');
    const cfg = await sandbox.exec(writeConfig, { timeoutMs: 20_000 });
    if (cfg.exitCode !== 0) {
      this.logger.warn(`pi models.json write failed: ${cfg.stderr}`);
    }
    // Ensure the pi CLI is present (sandbox images ship opencode, not pi).
    // Install lazily on first turn; subsequent warm turns find it cached.
    const ensurePi = [
      'command -v pi >/dev/null 2>&1',
      '|| npm install -g @earendil-works/pi-coding-agent >/dev/null 2>&1',
    ].join(' ');
    const install = await sandbox.exec(ensurePi, { timeoutMs: 180_000 });
    if (install.exitCode !== 0) {
      this.logger.warn(`pi install may have failed: ${install.stderr?.slice(-500)}`);
    }

    emit({
      id: 'pi-config',
      phase: 'connecting',
      label: 'pi configured',
      status: 'completed',
      detail: `model ${modelConfig.coderModel} via ${modelConfig.baseUrl}`,
    });

    // Compose the one-shot prompt. pi has no separate system-prompt flag in
    // print mode, so we prepend the composed instructions to the task.
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

    emit({
      id: 'pi-run',
      phase: 'running',
      label: 'pi is working',
      status: 'in_progress',
      command: `pi --print --model ${modelConfig.coderModel}`,
    });

    // `--offline` skips pi's startup network chatter (version/telemetry) so the
    // only egress is the model gateway. `-a` auto-approves project trust so the
    // non-interactive run doesn't stall on a prompt.
    const piCmd = [
      `export PI_OPENAI_API_KEY=${shSingleQuote(modelConfig.apiKey ?? '')}`,
      `export OPENAI_API_KEY="$PI_OPENAI_API_KEY"`,
      'export PI_OFFLINE=1',
      `pi --print --provider openai --model ${shSingleQuote(modelConfig.coderModel)} -a ${shSingleQuote(
        fullPrompt
      )}`,
    ].join(' && ');

    const res = await sandbox.exec(piCmd, { timeoutMs });
    const answer = (res.stdout || '').trim();

    if (res.exitCode !== 0) {
      emit({
        id: 'pi-run',
        phase: 'running',
        label: 'pi finished with errors',
        status: 'failed',
        command: `pi --print --model ${modelConfig.coderModel}`,
        output: (res.stderr || res.stdout || '').slice(-4000),
      });
      return {
        answer: answer || `pi exited ${res.exitCode}: ${(res.stderr || '').slice(-1000)}`,
        stopReason: 'error',
        timeline,
        toolCalls: [],
      };
    }

    emit({
      id: 'pi-run',
      phase: 'running',
      label: 'pi finished',
      status: 'completed',
      command: `pi --print --model ${modelConfig.coderModel}`,
      output: answer.slice(-4000),
    });

    return { answer, stopReason: 'completed', timeline, toolCalls: [] };
  }
}

/** Wrap a string in single quotes for POSIX sh, escaping embedded quotes. */
const shSingleQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

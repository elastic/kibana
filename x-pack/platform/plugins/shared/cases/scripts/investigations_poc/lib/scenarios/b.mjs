// Scenario B: the Hunt worker worked INV-218 for six hours and handed it to Tier 2 (the baseline scenario).
import { ensureAlerts } from '../alerts.mjs';
import { newCtx, runStandard, actorOf, verdictOf, summarize } from './common.mjs';

export const id = 'B';

const HOST = 'edge-sec-windows-2019-obtc-estec-0';

const PROMPTS = {
  m3: 'Start from the two alerts on edge-sec-windows-2019.',
  m6: 'What did rundll32.exe load, and is the file signed?',
  m9: 'Did the child cmd.exe touch LSASS?',
  m11: 'Can we confirm what the DLL contacted from DNS history?',
  m12: 'Can you capture memory of the shell, and what should we do about containment?',
  m14: 'Please hand this over to Priya K. with a short summary of where it stands.',
};

const firstSentence = (text) => (text.split(/(?<=[.?!])\s/)[0] ?? text).slice(0, 120);

export const run = async () => {
  const ctx = newCtx('B');
  const t = ctx.t;
  const hw = actorOf('HW', ctx.obo);
  const lastLogMs = Math.max(...ctx.d.state.log.map((l) => l.ts));

  const result = await runStandard(
    ctx,
    {
      createdProto: t(3, 12, 40),
      creator: hw,
      alerts: {
        spec: (c) => ({
          count: 5,
          hosts: [HOST],
          users: ['SYSTEM'],
          rules: [
            { name: 'Command Shell Activity Started via RunDLL32', severity: 'low', risk_score: 21, reason: 'process event', process: 'cmd.exe' },
            { name: 'Potential Credential Access via Windows Utilities', severity: 'high', risk_score: 73, reason: 'process event', process: 'cmd.exe' },
            { name: 'Process Execution from an Unusual Directory', severity: 'medium', risk_score: 47, reason: 'process event', process: 'rundll32.exe' },
            { name: 'Suspicious Endpoint Security Parental Process', severity: 'medium', risk_score: 47, reason: 'process event', process: 'rundll32.exe' },
            { name: 'Potential Masquerading as Business App Installer', severity: 'medium', risk_score: 47, reason: 'process event', process: 'upd.dll' },
          ].map((r) => ({ ...r, sourceIp: '10.20.4.17', destinationIps: ['203.0.113.44'] })),
          start: c.clock.iso(t(3, 11, 30)),
          end: c.clock.iso(t(3, 40, 0)),
          defaults: { host: HOST, user: 'SYSTEM' },
        }),
      },
      extraAlertsActor: 'HW',
      scopeActor: 'HW',
      scopeCreatedProto: t(3, 16, 10),
      taskActorCode: 'HW',
      taskCreatedProto: t(3, 12, 41),
      proposals: { actorCode: 'HW', meta: { default: { createdProto: t(8, 18, 30) } } },
      timelineActor: 'HW',
      timelineCreatedProto: t(3, 15, 2),
      patches: (c) => [
        { tsMs: c.clock.labelMs('12 min ago'), body: { agent_verdict: verdictOf(c), actor: hw } },
      ],
      conversations: {
        prompts: PROMPTS,
        prompter: 'BW',
        mainActor: 'BW',
        threadTitleOf: (_key, _msg, th) => firstSentence(th.msgs[0].t),
      },
      finalTouch: { actor: hw, tsMs: ctx.clock.ms(lastLogMs) },
    },
    { ensureAlerts }
  );
  return { ctx, result, summary: await summarize(ctx, { related: result.related.length }) };
};

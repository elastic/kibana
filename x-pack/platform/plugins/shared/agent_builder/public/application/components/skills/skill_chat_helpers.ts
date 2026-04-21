/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { EvalResults } from './types';

// Shared helpers used by both the standalone skill editor (skills/skill_form.tsx)
// and the agent-centric skill edit flyout (agents/skills/skill_edit_flyout.tsx)
// so that opening the AI sidebar with skill context + eval results behaves the
// same in both entry points.

export const buildSidebarAttachments = ({
  skillName,
  skillDescription,
  skillContent,
  isReadonly,
  evalResults,
}: {
  skillName: string;
  skillDescription: string;
  skillContent: string;
  isReadonly: boolean;
  evalResults?: EvalResults;
}): AttachmentInput[] => {
  const attachments: AttachmentInput[] = [
    {
      type: 'skill-context',
      data: {
        name: skillName,
        description: skillDescription,
        content: skillContent,
        readonly: isReadonly,
      },
      hidden: true,
    },
  ];

  if (evalResults) {
    attachments.push({
      type: 'eval-results',
      data: evalResults as unknown as Record<string, unknown>,
      hidden: true,
    });
  }

  return attachments;
};

export const buildInitialMessage = ({
  isCreateMode,
  evalResults,
  skillName,
}: {
  isCreateMode: boolean;
  evalResults?: EvalResults;
  skillName: string;
}): string | undefined => {
  if (isCreateMode) {
    return i18n.translate('xpack.agentBuilder.skills.chat.createInitialMessage', {
      defaultMessage:
        'I want to create a new Agent Builder skill. Help me draft the name, description, and instructions content.',
    });
  }

  if (evalResults) {
    const { summary, evaluatorScores } = evalResults;
    const weakest = evaluatorScores.reduce(
      (min, e) => (e.meanScore < min.meanScore ? e : min),
      evaluatorScores[0]
    );
    return i18n.translate('xpack.agentBuilder.skills.chat.evalInitialMessage', {
      defaultMessage:
        'My skill "{skillName}" scored {score}% on evaluation (pass rate: {passRate}%). The weakest evaluator was "{weakestName}" at {weakestScore}%. Help me improve it.',
      values: {
        skillName,
        score: (summary.meanScore * 100).toFixed(0),
        passRate: (summary.passRate * 100).toFixed(0),
        weakestName: weakest?.name ?? 'unknown',
        weakestScore: weakest ? (weakest.meanScore * 100).toFixed(0) : '0',
      },
    });
  }

  return undefined;
};

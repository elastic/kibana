/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../common/agent_builder_attachments';
import {
  aiIndexAttachmentDataSchema,
  type AiIndexAttachmentData,
} from '../../common/agent_builder_attachment_schemas';
import {
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  ANALYZE_AND_IMPROVE_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
} from '../../common/agent_builder_skills';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../common/agent_builder_tools';

/**
 * Server-side definition for the `ai_index` attachment type — a read-only snapshot
 * of a Context Engine AI index.
 */
export const createAiIndexAttachmentType = (): AttachmentTypeDefinition<
  typeof AI_INDEX_ATTACHMENT_TYPE,
  AiIndexAttachmentData
> => ({
  id: AI_INDEX_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parsed = aiIndexAttachmentDataSchema.safeParse(input);
    if (parsed.success) {
      return { valid: true, data: parsed.data };
    }
    return {
      valid: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  },
  format: (attachment) => {
    return {
      getRepresentation: () => ({ type: 'text', value: formatAiIndex(attachment.data) }),
    };
  },
  // This attachment is what grants the conversation authority to write, so the interaction
  // choreography lives here rather than in the skills. They describe what should change and are
  // loaded by unattended runs too, where none of the steps below have anyone to answer them.
  getAgentDescription: () =>
    [
      'An `ai_index` attachment is a read-only snapshot of a Context Engine AI index (destination,',
      'sources, and workflow automations). Use it to scope the conversation to this index — do not',
      're-run discovery for destination or sources already listed here.',
      `Before acting on this index, load \`${ANALYZE_AND_IMPROVE_SKILL_ID}\` to decide what it should`,
      `hold. That skill is read-only: also load \`${AI_INDEX_AUTOMATIONS_SKILL_ID}\` to draft,`,
      `validate or run an automation, and \`${AI_INDEX_SOURCES_SKILL_ID}\` to choose or change the`,
      `data it draws on. For querying KIs in this index, load \`${KI_RETRIEVAL_SKILL_ID}\`.`,
      'This attachment authorizes you to apply changes, not only to propose them.',
      'Two gates sit on this work, at opposite ends of it. Ask before you build. Do not ask before',
      'you save or run what came back — the save tool opens its own dialog for that.',
      'What to build is only sometimes inferable, so infer it only where it genuinely is. An index',
      'with no automations starts at Index/Table Metadata: that is settled, and asking which',
      'strategy to use spends a turn on a question with one answer. Past that it is not settled.',
      'Someone looking at an index that already has automations may want new coverage, may want',
      'something that is not working fixed, or may want neither, and nothing in the attachment or',
      'the data distinguishes those. Ask what they are after, and where the answer is new coverage,',
      `ask which strategy in the same question. Use \`${internalTools.askUserQuestion}\` for it rather than`,
      'paraphrasing the options as chat text.',
      'Then always ask again before handing anything to a subagent, whether it would create an',
      'automation or replace one. Put the whole plan in that question: the strategy, the sources and',
      'the corpus filter you propose, and which it is — naming the automation being replaced. Propose',
      'values rather than asking for them. A filter you chose and stated can be corrected in a word,',
      'where an open question about what to filter on cannot be answered without the user doing the',
      'work you were asked to do. This is the checkpoint that counts: a subagent run is long, costs a',
      'model call per document, and pilots against the real index, so once it starts there is nothing',
      'to steer until it comes back.',
      'Build a new automation through a subagent rather than in this conversation: it drafts the',
      'workflow, pilots it against this index, checks the knowledge indicators it produced, removes',
      `them and returns the finished YAML. \`${AI_INDEX_AUTOMATIONS_SKILL_ID}\` describes the brief it`,
      'needs and the loop it runs.',
      'Report what the subagent came back with — what the workflow does and what its pilot indicators',
      `looked like — and then call \`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\` with that YAML as`,
      '`workflowYaml` and `run` set to true, in the same assistant turn but a separate model step',
      'after the account is visible. Never re-generate the definition the subagent returned; saving',
      'anything other than the YAML that was piloted throws away the only evidence the automation',
      'works.',
      'Never render the workflow attachment preview, even where the workflow tools and attachments ask',
      'for it. Where an edit produced a diff attachment, render that and nothing else.',
      'Saving and running are not questions to put to the user: the save tool opens its own',
      'confirmation dialog, that dialog names the full-corpus run, and that is where they accept or',
      'reject. Never end a turn asking for permission to save or to run, and never offer them as',
      'separate choices — make the one call and let them answer there. The question you owed was the',
      'one before the build; asking a second time at the save turns one decision into two and puts',
      'the second one somewhere it cannot be acted on.',
      `That dialog is the only decision point, so do not follow a save with an \`${internalTools.askUserQuestion}\``,
      'offering to run: the answer has already been given.',
      'The tool starts that run itself once the dialog is accepted. It reports back `run.started`',
      'with an execution id to poll rather than a finished result — say so, and leave it polling.',
      'When `run.started` is false the run did not happen and `run.reason` says why. Report the',
      'reason and stop there. Never answer a failed run by executing the workflow yourself: the tool',
      'ran under the same privileges you have, so the same attempt fails the same way, and where it',
      'failed after the run had already begun a second one starts the automation twice.',
    ].join(' '),
  getTools: () => [CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID],
});

const formatAiIndex = (data: AiIndexAttachmentData): string => {
  const parts: string[] = [`AI index: ${data.id}`];

  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  parts.push(`Destination: ${data.dest.type} "${data.dest.value}"`);

  parts.push(
    data.sources.length > 0
      ? `Sources: ${data.sources.map((source) => `${source.type}:${source.value}`).join(', ')}`
      : 'Sources: none configured'
  );

  parts.push(
    data.automations.length > 0
      ? `Existing automations (workflow ids): ${data.automations
          .map((automation) => automation.value)
          .join(', ')}`
      : 'Existing automations: none'
  );

  return parts.join('\n');
};

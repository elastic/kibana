/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient, withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { lastValueFrom, map } from 'rxjs';
import { Logger } from '@kbn/logging';
import { EntityInvestigation } from './investigate_entity';
import {
  RCA_SYSTEM_PROMPT_BASE,
  SYSTEM_PROMPT_CHANGES,
  SYSTEM_PROMPT_ENTITIES,
} from './system_prompt_base';
import { stringifySummaries } from './stringify_summaries';
import { formatEntity } from './format_entity';

const INITIAL_OBSERVATION_TASK_GUIDE = `Your current task is to write observations based on the initial context. You
should acknowledge the context briefly, and mention key observations from the
initial context. 

Then, briefly describe what change you are looking for. Are the symptoms:

- rapid, or gradual onset?
- subtle or prounounced?

When considering the initial context, reason about relevant changes to observe,
such as short-lived versus persistent changes or singular events, like scale
events, rollouts, or configuration changes.

After, taking into account the capabilities you have, plan for next steps.

Describe the next step, which is to investigate the entity found in the initial
context. Only mention the entity (as a field/value). Do not mention any
additional filters.

Be brief, accurate, and critical.`;

const INVESTIGATION_ADDENDUM = `
**Task Guide: Observe the investigation results**

You will receive one or more investigations. These investigations mention:
- a general characterization of the entity based on its data
- relevant log patterns
- other signals, like SLOs or alerts
- possibly related entities, and investigation suggestions

First, you should briefly acknowledge the initial context of the investigation
and the hypotheses that have been defined along the way. Next, you should note
key observations from the investigations, and how they relate to the ongoing
investigation. You should also reason about how the observations can influence
the ongoing hypotheses (eg, there might be evidence in favor or against the
current hypotheses). 

Secondly, the agent should generate a timeline of significant events -
discarding events from the previous observations or investigated entities that
are not significant to the ongoing investigation. This timeline should include:
- the timestamp of the significant event - if there is none, use the start of
the investigation. YOU MUST use existing timestamps from the investigated
entities or previous observations, don't make one up.
- the description of the event - e.g. the log pattern, the alert or SLO name, or
something else.
- the significance of the event - is it critical? unusual? and how it impacts
the ongoing investigation and the hypothesis.

Next, it should, if needed, revise its hypotheses and consider next steps. it's
always important to contextualize the hypotheses in the initial context of the
investigation. Focus on your strongest hypotheses, and restrict the number to
one or two. These hypotheses should be related to finding out the cause of the
initial context of the investigation - you should not concern yourself with the
impact on _other_ entities. Focus on the strongest hypothesis.

First, reason about whether you need to conclude the investigation:
- Are you relatively confident about the root cause (such as an event that signals
a change in the system, such as the rollout of a new service version)?
- Is your hypothesis or the evidence for your hypothesis significantly changing?
If not, it might be good to end the investigation.
- Will any of the related entities help you in determining root cause, or just
assess impact? If the latter, end the investigation.

If the conclusion is you need to continue your investigation, mention the entities
that should be investigated. Do this only if there is a significant change one of
the related entities will give you new insights into the root cause (instead of
just the impact).`;

function getInitialPrompts(initialContext: string) {
  return {
    system: `${RCA_SYSTEM_PROMPT_BASE}

    ${SYSTEM_PROMPT_ENTITIES}

    ${SYSTEM_PROMPT_CHANGES}`,
    input: `## Context
    
    ${initialContext}
    
    ${INITIAL_OBSERVATION_TASK_GUIDE}`,
  };
}

function getObserveInvestigationsPrompts({
  summaries,
  investigations,
}: {
  summaries: ObservationStepSummary[];
  investigations: EntityInvestigation[];
}) {
  const previouslyInvestigatedEntities = summaries.flatMap((summary) =>
    summary.investigations.map((investigation) => investigation.entity)
  );

  const investigationsPrompt = `Observe the following investigations that recently concluded:
    ${investigations
      .map((investigation, index) => {
        return `## ${index}: investigation of ${formatEntity(investigation.entity)}
      
      ${investigation.summary}

      ${
        investigation.relationships.length
          ? `### Relationships to ${formatEntity(investigation.entity)}
      
      ${JSON.stringify(investigation.relationships)}
      
      `
          : ``
      }
      `;
      })
      .join('\n\n')}
      
  ${INVESTIGATION_ADDENDUM}
  
  ${
    previouslyInvestigatedEntities.length
      ? `The following entities have been investigated previously:
  
  ${previouslyInvestigatedEntities.map((entity) => `- ${JSON.stringify(entity)}`).join('\n')}
  `
      : ``
  }`;

  const systemPrompt = `${RCA_SYSTEM_PROMPT_BASE}

    ${SYSTEM_PROMPT_ENTITIES}
    
    ${stringifySummaries(summaries)}`;

  return {
    system: systemPrompt,
    input: investigationsPrompt,
  };
}

export interface ObservationStepSummary {
  investigations: EntityInvestigation[];
  content: string;
}

export function observe({
  inferenceClient,
  connectorId,
  summaries,
  investigations,
  initialContext,
  logger,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  summaries: ObservationStepSummary[];
  investigations: EntityInvestigation[];
  initialContext: string;
  logger: Logger;
}): Promise<ObservationStepSummary> {
  logger.debug(
    () =>
      `Observing ${investigations.length} investigations (${summaries.length} previous summaries)`
  );

  const { system, input } = investigations.length
    ? getObserveInvestigationsPrompts({ summaries, investigations })
    : getInitialPrompts(initialContext);

  return lastValueFrom(
    inferenceClient
      .output('observe', {
        system,
        input,
        connectorId,
      })
      .pipe(
        withoutOutputUpdateEvents(),
        map((outputCompleteEvent) => {
          return {
            content: outputCompleteEvent.content,
            investigations,
          };
        })
      )
  );
}

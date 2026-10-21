/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import { CLASSIC_EPISODE_SOURCE_ID } from '../classic_alerts/constants';
import type { ClassicAlertActionContext } from '../classic_alerts/utils/map_alert';
import {
  openAddToCaseModal,
  type AddToCaseCasesService,
  type CaseAlertItem,
  type CasesOwner,
  type CasesPermissions,
  type CaseSummary,
} from '../components/add_to_case_modal';
import type { EpisodeAction } from './types';
import * as i18n from './translations';
import { ADD_TO_CASE_EPISODE_ACTION_ID } from './add_to_case_action_id';

export interface AddToCaseActionDeps<
  TPermissions extends CasesPermissions = CasesPermissions,
  TAttachment = unknown
> {
  cases: AddToCaseCasesService<TPermissions, TAttachment>;
  /** Cases owner the attachments are created under unless an existing case dictates another. */
  owner: CasesOwner;
  rendering: CoreStart['rendering'];
  /** Services the Cases components read through `useKibana`. */
  kibanaServices: Record<string, unknown>;
}

const getClassicActionContext = (episode: AlertEpisode): ClassicAlertActionContext | undefined =>
  episode.source_id === CLASSIC_EPISODE_SOURCE_ID
    ? (episode.source_action_context as ClassicAlertActionContext | undefined)
    : undefined;

const toCaseAlertItem = (
  episode: AlertEpisode,
  { alertUuid, index }: ClassicAlertActionContext
): CaseAlertItem => ({
  ecs: { _id: alertUuid, _index: index },
  data: [
    { field: ALERT_RULE_UUID, value: [episode['rule.id']] },
    { field: ALERT_RULE_NAME, value: [episode['rule.name'] ?? ''] },
  ],
});

/** Adds classic (v1) alerts to a case through the Cases "add to existing case" modal. */
export const createAddToCaseAction = <TPermissions extends CasesPermissions, TAttachment>(
  deps: AddToCaseActionDeps<TPermissions, TAttachment>
): EpisodeAction => ({
  id: ADD_TO_CASE_EPISODE_ACTION_ID,
  order: 38,
  displayName: i18n.ADD_TO_CASE,
  iconType: 'casesApp',
  enforcesOwnPrivileges: true,
  isCompatible: ({ episodes }) => {
    const { create, read } = deps.cases.helpers.canUseCases([deps.owner]);
    return (
      create &&
      read &&
      episodes.length > 0 &&
      episodes.every((episode) => getClassicActionContext(episode) != null)
    );
  },
  execute: async ({ episodes, onSuccess }) => {
    const getAttachments = ({ theCase }: { theCase?: CaseSummary }) => {
      const items = episodes.flatMap((episode) => {
        const context = getClassicActionContext(episode);
        if (!context || (theCase?.id && context.caseIds.includes(theCase.id))) return [];
        return [toCaseAlertItem(episode, context)];
      });

      return deps.cases.helpers.groupAlertsByRule(items, theCase?.owner ?? deps.owner);
    };

    openAddToCaseModal(deps, {
      getAttachments,
      onSuccess: () => onSuccess?.(),
      noAttachmentsToaster: {
        title: i18n.NO_ALERTS_ADDED_TO_CASE,
        content: i18n.ALERTS_ALREADY_ATTACHED_TO_CASE,
      },
    });
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type {
  ConversationEventUIDefinition,
  ConversationEventsServiceStartContract,
} from '@kbn/agent-builder-browser';
import {
  ASSIGNEES_CHANGED_EVENT_TYPE,
  type AssigneesChangedEventData,
} from '../../../common/assignments/conversation_events';
import { EventVia, getViaIcon } from '../../conversation_events/event_via';
import { useUserProfiles } from '../../user_profiles';

/** Renders the names of the given uids, falling back to the uid for a profile that can't be resolved. */
const renderUsers = (uids: string[], names: Map<string, string>) =>
  uids.map((uid, index) => (
    <React.Fragment key={uid}>
      {index > 0 && ', '}
      <strong>{names.get(uid) ?? uid}</strong>
    </React.Fragment>
  ));

export const AssigneesChangedEvent = memo(
  ({ data: { added, removed, via } }: { data: AssigneesChangedEventData }) => {
    const { data: profiles, isLoading } = useUserProfiles({ uids: added.concat(removed) });

    const names = new Map<string, string>();
    for (const { uid, user } of profiles ?? []) {
      names.set(uid, user.full_name || user.username);
    }

    return (
      <>
        <EuiText size="s" color="primary" data-test-subj="assigneesChangedEvent">
          {isLoading ? (
            <EuiSkeletonText lines={1} size="s" />
          ) : (
            <EuiFlexGroup alignItems="center" direction="row">
              {added.length > 0 && (
                <EuiFlexItem data-test-subj="assigneesChangedEventAdded" grow={false}>
                  <div>
                    <FormattedMessage
                      id="xpack.agenticInvestigations.assignments.events.added"
                      defaultMessage="Assigned {users}"
                      values={{ users: renderUsers(added, names) }}
                    />
                  </div>
                </EuiFlexItem>
              )}
              {removed.length > 0 && (
                <EuiFlexItem data-test-subj="assigneesChangedEventRemoved">
                  <div>
                    <FormattedMessage
                      id="xpack.agenticInvestigations.assignments.events.removed"
                      defaultMessage="Unassigned {users}"
                      values={{ users: renderUsers(removed, names) }}
                    />
                  </div>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </EuiText>
        <EventVia via={via} />
      </>
    );
  }
);

AssigneesChangedEvent.displayName = 'AssigneesChangedEvent';

export const createAssigneesChangedEventUiDefinition = ({
  core,
}: {
  core: CoreStart;
}): ConversationEventUIDefinition<
  typeof ASSIGNEES_CHANGED_EVENT_TYPE,
  AssigneesChangedEventData
> => {
  // The timeline mounts custom events outside this plugin's React tree, so the renderer brings
  // its own providers. One client per definition lets events in a timeline share profile lookups.
  const queryClient = new QueryClient();

  return {
    type: ASSIGNEES_CHANGED_EVENT_TYPE,
    getHeader: ({ data }) => ({
      icon: getViaIcon(data.via),
      label: i18n.translate('xpack.agenticInvestigations.assignments.events.headerLabel', {
        defaultMessage: 'Assignees',
      }),
    }),
    render: ({ data }) => (
      <KibanaContextProvider services={core}>
        <QueryClientProvider client={queryClient}>
          <AssigneesChangedEvent data={data} />
        </QueryClientProvider>
      </KibanaContextProvider>
    ),
  };
};

export const registerAssignmentConversationEventUiDefinitions = ({
  conversationEvents,
  core,
}: {
  conversationEvents: ConversationEventsServiceStartContract;
  core: CoreStart;
}): void => {
  conversationEvents.register(createAssigneesChangedEventUiDefinition({ core }));
};

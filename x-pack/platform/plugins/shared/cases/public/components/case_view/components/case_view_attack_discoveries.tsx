/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { CaseUI } from '../../../../common';
import { AttachmentType } from '../../../../common/types/domain';
import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '../../../../common/constants';
import type { AttachmentUI } from '../../../containers/types';
import { UserActionsList } from '../../user_actions/user_actions_list';
import { useFindCaseUserActions } from '../../../containers/use_find_case_user_actions';
import { useGetCaseConnectors } from '../../../containers/use_get_case_connectors';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useGetCaseUsers } from '../../../containers/use_get_case_users';
import { parseCaseUsers } from '../../utils';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';

interface CaseViewAttackDiscoveriesProps {
    caseData: CaseUI;
}

export const CaseViewAttackDiscoveries = ({ caseData }: CaseViewAttackDiscoveriesProps) => {
    // Fetch user actions - this will get the latest data
    const { data: userActionsData, isLoading } = useFindCaseUserActions(
        caseData.id,
        {
            type: 'all',
            sortOrder: 'asc',
            page: 1,
            perPage: 100, // Maximum allowed perPage value
        },
        true
    );

    const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
    const { data: casesConfiguration } = useGetCaseConfiguration();
    const { data: caseUsers } = useGetCaseUsers(caseData.id);
    const { data: currentUserProfile } = useGetCurrentUserProfile();

    // Wait for required data to load
    if (!caseConnectors || !casesConfiguration) {
        return null;
    }

    const { userProfiles } = parseCaseUsers({
        caseUsers,
        createdBy: caseData.createdBy,
    });

    // Filter attachments to only attack discoveries - use latestAttachments from userActionsData
    const attackDiscoveryAttachments = useMemo(() => {
        if (!userActionsData) return [];
        return userActionsData.latestAttachments.filter((attachment: AttachmentUI) => {
            if (attachment.type !== AttachmentType.externalReference) {
                return false;
            }
            return (
                'externalReferenceAttachmentTypeId' in attachment &&
                attachment.externalReferenceAttachmentTypeId === ATTACK_DISCOVERY_ATTACHMENT_TYPE
            );
        });
    }, [userActionsData]);

    // Get attack discovery attachment IDs from the filtered attachments
    const attackDiscoveryIds = useMemo(
        () => attackDiscoveryAttachments.map((ad) => ad.id),
        [attackDiscoveryAttachments]
    );

    // Filter user actions to only show attack discovery attachments
    const attackDiscoveryUserActions = useMemo(() => {
        if (!userActionsData) return [];
        return userActionsData.userActions.filter(
            (userAction) =>
                userAction.type === 'comment' &&
                userAction.action === 'create' &&
                userAction.commentId != null &&
                attackDiscoveryIds.includes(userAction.commentId)
        );
    }, [userActionsData, attackDiscoveryIds]);

    if (attackDiscoveryAttachments.length === 0 && !isLoading) {
        return (
            <EuiFlexItem
                css={css`
          width: 100%;
        `}
                data-test-subj="case-view-attack-discoveries"
            >
                <EuiEmptyPrompt
                    iconType="bug"
                    title={<h3>No attack discoveries</h3>}
                    body={<p>Attack discoveries will appear here when they are generated for this case.</p>}
                />
            </EuiFlexItem>
        );
    }

    return (
        <EuiFlexItem
            css={css`
        width: 100%;
      `}
            data-test-subj="case-view-attack-discoveries"
        >
            <UserActionsList
                caseUserActions={attackDiscoveryUserActions}
                attachments={attackDiscoveryAttachments}
                caseConnectors={caseConnectors}
                userProfiles={userProfiles ?? new Map()}
                currentUserProfile={currentUserProfile}
                data={caseData}
                casesConfiguration={casesConfiguration}
                getRuleDetailsHref={undefined}
                actionsNavigation={undefined}
                onRuleDetailsClick={() => { }}
                onShowAlertDetails={() => { }}
                loadingAlertData={false}
                manualAlertsData={{}}
                commentRefs={{ current: {} }}
                handleManageQuote={() => { }}
            />
        </EuiFlexItem>
    );
};

CaseViewAttackDiscoveries.displayName = 'CaseViewAttackDiscoveries';


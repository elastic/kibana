/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import copy from 'copy-to-clipboard';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';

import { LocalizedDateTooltip } from '../../../../components/localized_date_tooltip';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';
import { navTabs } from '../../../home/home_navigations';
import { PropertyActions } from '../property_actions';
import { SiemPageName } from '../../../home/types';
import * as i18n from './translations';

const MySpinner = styled(EuiLoadingSpinner)`
  .euiLoadingSpinner {
    margin-top: 1px; // yes it matters!
  }
`;

interface UserActionTitleProps {
  createdAt: string;
  id: string;
  isLoading: boolean;
  labelEditAction?: string;
  labelQuoteAction?: string;
  labelTitle: JSX.Element;
  linkId?: string | null;
  updatedAt?: string | null;
  username: string;
  onEdit?: (id: string) => void;
  onQuote?: (id: string) => void;
  outlineComment?: (id: string) => void;
}

export const UserActionTitle = ({
  createdAt,
  id,
  isLoading,
  labelEditAction,
  labelQuoteAction,
  labelTitle,
  linkId,
  username,
  updatedAt,
  onEdit,
  onQuote,
  outlineComment,
}: UserActionTitleProps) => {
  const { detailName: caseId } = useParams();
  const urlSearch = useGetUrlSearch(navTabs.case);
  const propertyActions = useMemo(() => {
    return [
      ...(labelEditAction != null && onEdit != null
        ? [
            {
              iconType: 'pencil',
              label: labelEditAction,
              onClick: () => onEdit(id),
            },
          ]
        : []),
      ...(labelQuoteAction != null && onQuote != null
        ? [
            {
              iconType: 'quote',
              label: labelQuoteAction,
              onClick: () => onQuote(id),
            },
          ]
        : []),
    ];
  }, [id, labelEditAction, onEdit, labelQuoteAction, onQuote]);

  const handleAnchorLink = useCallback(() => {
    copy(
      `${window.location.origin}${window.location.pathname}#${SiemPageName.case}/${caseId}/${id}${urlSearch}`,
      {
        debug: true,
      }
    );
  }, [caseId, id, urlSearch]);

  const handleMoveToLink = useCallback(() => {
    if (outlineComment != null && linkId != null) {
      outlineComment(linkId);
    }
  }, [linkId, outlineComment]);

  return (
    <EuiText size="s" className="userAction__title" data-test-subj={`user-action-title`}>
      <EuiFlexGroup
        alignItems="baseline"
        gutterSize="none"
        justifyContent="spaceBetween"
        component="span"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span">
            <EuiFlexItem grow={false}>
              <strong>{username}</strong>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{labelTitle}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LocalizedDateTooltip date={new Date(createdAt)}>
                <FormattedRelative
                  data-test-subj="user-action-title-creation-relative-time"
                  value={createdAt}
                />
              </LocalizedDateTooltip>
            </EuiFlexItem>
            {updatedAt != null && (
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {'('}
                  {i18n.EDITED_FIELD}{' '}
                  <LocalizedDateTooltip date={new Date(updatedAt)}>
                    <FormattedRelative
                      data-test-subj="user-action-title-edited-relative-time"
                      value={updatedAt}
                    />
                  </LocalizedDateTooltip>
                  {')'}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="none">
            {!isEmpty(linkId) && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.MOVE_TO_ORIGINAL_COMMENT}
                  onClick={handleMoveToLink}
                  iconType="arrowUp"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.COPY_LINK_COMMENT}
                onClick={handleAnchorLink}
                iconType="link"
                id={`${id}-permLink`}
              />
            </EuiFlexItem>
            {propertyActions.length > 0 && (
              <EuiFlexItem grow={false}>
                {isLoading && <MySpinner />}
                {!isLoading && <PropertyActions propertyActions={propertyActions} />}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

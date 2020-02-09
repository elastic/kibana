/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonToggle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';

import styled, { css } from 'styled-components';
import * as i18n from './translations';
import { DescriptionMarkdown } from '../description_md_editor';
import { FlattenedCaseSavedObject, UpdateCase } from '../../../../containers/case/types';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { getCaseUrl } from '../../../../components/link_to';
import { HeaderPage } from '../../../../components/header_page_new';
import { Markdown } from '../../../../components/markdown';
import { PropertyActions } from '../property_actions';
import { TagList } from '../tag_list';
import { useGetCase, RefreshCase } from '../../../../containers/case/use_get_case';
import { UserActionTree } from '../user_action_tree';
import { UserList } from '../user_list';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
import { WrapperPage } from '../../../../components/wrapper_page';

interface Props {
  caseId: string;
}

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

const MyWrapper = styled(WrapperPage)`
  padding-bottom: 0;
  // ${({ theme }) => css`
  //   @media only screen and (min-width: ${theme.eui.euiBreakpoints.l}) {
  //     margin: 0 auto;
  //     width: 85%;
  //   }
  // `}
`;
const BackgroundWrapper = styled.div`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade};
    border-top: ${theme.eui.euiBorderThin};
    height: 100%;
  `}
`;

interface CasesProps {
  caseId: string;
  initialData: FlattenedCaseSavedObject;
  isLoading: boolean;
  refreshCase: RefreshCase;
}

export const Cases = React.memo<CasesProps>(({ caseId, initialData, isLoading, refreshCase }) => {
  const [{ data }, dispatchUpdateCaseProperty] = useUpdateCase(caseId, initialData);
  const [isEditDescription, setIsEditDescription] = useState(false);
  const [isEditTitle, setIsEditTitle] = useState(false);
  const [isEditTags, setIsEditTags] = useState(false);
  const [isCaseOpen, setIsCaseOpen] = useState(data.state === 'open');
  const [description, setDescription] = useState(data.description);
  const [title, setTitle] = useState(data.title);
  const [tags, setTags] = useState(data.tags);

  const onUpdateField = useCallback(
    async (updateKey: keyof UpdateCase, updateValue?: string[]) => {
      switch (updateKey) {
        case 'title':
          if (title.length > 0) {
            dispatchUpdateCaseProperty({
              updateKey: 'title',
              updateValue: title,
            });
            setIsEditTitle(false);
          }
          break;
        case 'description':
          if (description.length > 0) {
            dispatchUpdateCaseProperty({
              updateKey: 'description',
              updateValue: description,
            });
            setIsEditDescription(false);
          }
          break;
        case 'tags':
          setTags(updateValue as string[]);
          if (title.length > 0) {
            dispatchUpdateCaseProperty({
              updateKey: 'tags',
              updateValue,
            });
            setIsEditTags(false);
          }
          break;
        default:
          return null;
      }
    },
    [dispatchUpdateCaseProperty]
  );

  useEffect(() => {
    const caseState = isCaseOpen ? 'open' : 'closed';
    if (data.state !== caseState) {
      dispatchUpdateCaseProperty({
        updateKey: 'state',
        updateValue: caseState,
      });
    }
  }, [isCaseOpen]);
  const propertyActions = [
    {
      iconType: 'documentEdit',
      label: 'Edit description',
      onClick: () => setIsEditDescription(true),
    },
    {
      iconType: 'securitySignalResolved',
      label: 'Close case',
      onClick: () => null,
    },
    {
      iconType: 'trash',
      label: 'Delete case',
      onClick: () => null,
    },
    {
      iconType: 'importAction',
      label: 'Push as ServiceNow incident',
      onClick: () => null,
    },
    {
      iconType: 'popout',
      label: 'View ServiceNow incident',
      onClick: () => null,
    },
    {
      iconType: 'importAction',
      label: 'Update ServiceNow incident',
      onClick: () => null,
    },
  ];
  const userActions = [
    {
      avatarName: data.created_by.username,
      title: (
        <EuiFlexGroup alignItems="baseline" gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <p>
              <strong>{`${data.created_by.username}`}</strong>
              {` ${i18n.ADDED_DESCRIPTION} `}{' '}
              <FormattedRelativePreferenceDate value={data.created_at} labelOn />
            </p>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PropertyActions propertyActions={propertyActions} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      children: isEditDescription ? (
        <>
          <DescriptionMarkdown
            descriptionInputHeight={200}
            initialDescription={data.description}
            isLoading={isLoading}
            onChange={updatedDescription => setDescription(updatedDescription)}
          />

          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={() => onUpdateField('description')}
              >
                {i18n.SUBMIT}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => setIsEditDescription(false)}>
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <Markdown raw={data.description} />
      ),
    },
    {
      avatarName: `steph`,
      title: (
        <p>
          <strong>{`steph`}</strong>
          {` ${i18n.ADDED_COMMENT} `}{' '}
          <FormattedRelativePreferenceDate value={data.created_at} labelOn />
        </p>
      ),
      children: <p>{'alright alright alright'}</p>,
    },
  ];
  return (
    <>
      <MyWrapper>
        <HeaderPage
          backOptions={{
            href: getCaseUrl(),
            text: i18n.BACK_TO_ALL,
          }}
          iconAction={{
            'aria-label': title,
            iconType: 'pencil',
            onChange: newTitle => setTitle(newTitle),
            onSubmit: () => onUpdateField('title'),
            onClick: isEdit => setIsEditTitle(isEdit),
          }}
          isEditTitle={isEditTitle}
          title={title}
        >
          <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <MyDescriptionList compressed>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <EuiBadge color={isCaseOpen ? 'secondary' : 'danger'}>{data.state}</EuiBadge>
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>{i18n.CASE_OPENED}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <FormattedRelativePreferenceDate value={data.created_at} />
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </MyDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="l" alignItems="center">
                <EuiFlexItem>
                  <EuiButtonToggle
                    label={isCaseOpen ? 'Close case' : 'Reopen case'}
                    iconType={isCaseOpen ? 'checkInCircleFilled' : 'magnet'}
                    onChange={() => setIsCaseOpen(!isCaseOpen)}
                    isSelected={isCaseOpen}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <PropertyActions propertyActions={propertyActions} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>
      </MyWrapper>
      <BackgroundWrapper>
        <MyWrapper>
          <EuiFlexGroup>
            <EuiFlexItem grow={6}>
              <UserActionTree userActions={userActions} />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <UserList headline={i18n.REPORTER} users={[data.created_by]} />
              <TagList
                tags={tags}
                iconAction={{
                  'aria-label': title,
                  iconType: 'pencil',
                  onSubmit: newTags => onUpdateField('tags', newTags),
                  onClick: isEdit => setIsEditTags(isEdit),
                }}
                isEditTags={isEditTags}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </MyWrapper>
      </BackgroundWrapper>
    </>
  );
});

export const CaseView = React.memo(({ caseId }: Props) => {
  const [{ data, isLoading, isError }, refreshCase] = useGetCase(caseId);
  if (isError) {
    return null;
  }
  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Cases caseId={caseId} initialData={data} refreshCase={refreshCase} isLoading={isLoading} />
  );
});

CaseView.displayName = 'CaseView';

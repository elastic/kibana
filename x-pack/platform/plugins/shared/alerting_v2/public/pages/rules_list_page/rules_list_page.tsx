/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiHorizontalRule,
  EuiPageHeader,
  EuiPopover,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { RuleApiResponse } from '../../services/rules_api';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { DeleteConfirmationModal } from '../../components/rule/delete_confirmation_modal';
import { paths } from '../../constants';

const DEFAULT_PER_PAGE = 20;

const descriptionTextStyle = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

interface RuleActionsMenuProps {
  rule: RuleApiResponse;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled: (rule: RuleApiResponse) => void;
}

const RuleActionsMenu = ({
  rule,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
}: RuleActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    <EuiContextMenuItem
      key="edit"
      icon={<EuiIcon type="pencil" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onEdit(rule);
      }}
      data-test-subj={`editRule-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.edit', { defaultMessage: 'Edit' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="clone"
      icon={<EuiIcon type="copy" size="m" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onClone(rule);
      }}
      data-test-subj={`cloneRule-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.clone', { defaultMessage: 'Clone' })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="toggleEnabled"
      icon={<EuiIcon type={rule.enabled ? 'bellSlash' : 'bell'} size="m" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onToggleEnabled(rule);
      }}
      data-test-subj={`toggleEnabledRule-${rule.id}`}
    >
      {rule.enabled
        ? i18n.translate('xpack.alertingV2.rulesList.action.disable', {
            defaultMessage: 'Disable',
          })
        : i18n.translate('xpack.alertingV2.rulesList.action.enable', {
            defaultMessage: 'Enable',
          })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon={<EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />}
      onClick={() => {
        setIsOpen(false);
        onDelete(rule);
      }}
      data-test-subj={`deleteRule-${rule.id}`}
    >
      {i18n.translate('xpack.alertingV2.rulesList.action.delete', {
        defaultMessage: 'Delete',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          aria-label={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
            defaultMessage: 'More actions',
          })}
          color="text"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={`ruleActionsButton-${rule.id}`}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};

export const RulesListPage = () => {
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);

  const { data, isLoading, isError, error } = useFetchRules({ page, perPage });
  const deleteRuleMutation = useDeleteRule();
  const toggleEnabledMutation = useToggleRuleEnabled();

  const onTableChange = ({ page: tablePage }: CriteriaWithPagination<RuleApiResponse>) => {
    setPage(tablePage.index + 1);
    setPerPage(tablePage.size);
  };

  const onDeleteConfirm = () => {
    if (!ruleToDelete) {
      return;
    }
    deleteRuleMutation.mutate(ruleToDelete.id, {
      onSettled: () => setRuleToDelete(null),
    });
  };

  const pagination = {
    pageIndex: page - 1,
    pageSize: perPage,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 20, 50],
  };

  const columns: Array<EuiBasicTableColumn<RuleApiResponse>> = [
    {
      field: 'metadata',
      name: <FormattedMessage id="xpack.alertingV2.rulesList.column.name" defaultMessage="Name" />,
      width: '20%',
      render: (metadata: RuleApiResponse['metadata'], rule: RuleApiResponse) => (
        <div>
          <EuiText size="s">{metadata?.name ?? rule.id}</EuiText>
          {metadata?.description && (
            <EuiText size="xs" color="subdued" css={descriptionTextStyle}>
              {metadata.description}
            </EuiText>
          )}
        </div>
      ),
    },
    {
      field: 'evaluation',
      name: (
        <FormattedMessage id="xpack.alertingV2.rulesList.column.source" defaultMessage="Source" />
      ),
      width: '18%',
      truncateText: true,
      render: (evaluation: RuleApiResponse['evaluation']) => {
        const source = getIndexPatternFromESQLQuery(evaluation?.query?.base) || undefined;
        return source ? (
          <EuiBadge color="hollow">{source}</EuiBadge>
        ) : (
          <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
        );
      },
    },
    {
      field: 'metadata',
      name: (
        <FormattedMessage id="xpack.alertingV2.rulesList.column.labels" defaultMessage="Labels" />
      ),
      width: '12%',
      render: (_metadata: RuleApiResponse['metadata']) => {
        const labels = _metadata?.labels;
        if (!labels || labels.length === 0) {
          return <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />;
        }
        return (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {labels.map((label) => (
              <EuiFlexItem key={label} grow={false}>
                <EuiBadge color="hollow">{label}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'kind',
      name: <FormattedMessage id="xpack.alertingV2.rulesList.column.mode" defaultMessage="Mode" />,
      width: '12%',
      render: (kind: string) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={kind === 'alert' ? 'bell' : 'securitySignalResolved'}
              size="m"
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {kind === 'alert'
              ? i18n.translate('xpack.alertingV2.rulesList.modeAlerting', {
                  defaultMessage: 'Alerting',
                })
              : i18n.translate('xpack.alertingV2.rulesList.modeDetectOnly', {
                  defaultMessage: 'Detect only',
                })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'enabled',
      name: (
        <FormattedMessage id="xpack.alertingV2.rulesList.column.status" defaultMessage="Status" />
      ),
      width: '10%',
      render: (enabled: boolean) =>
        enabled ? (
          <EuiBadge color="success" data-test-subj="ruleStatusEnabled">
            {i18n.translate('xpack.alertingV2.rulesList.statusEnabled', {
              defaultMessage: 'Enabled',
            })}
          </EuiBadge>
        ) : (
          <EuiBadge color="default" data-test-subj="ruleStatusDisabled">
            {i18n.translate('xpack.alertingV2.rulesList.statusDisabled', {
              defaultMessage: 'Disabled',
            })}
          </EuiBadge>
        ),
    },
    {
      name: (
        <FormattedMessage id="xpack.alertingV2.rulesList.column.actions" defaultMessage="Actions" />
      ),
      width: '6%',
      align: 'right',
      render: (rule: RuleApiResponse) => (
        <RuleActionsMenu
          rule={rule}
          onEdit={(r) => navigateToUrl(basePath.prepend(paths.ruleEdit(r.id)))}
          onClone={(r) =>
            navigateToUrl(
              basePath.prepend(`${paths.ruleCreate}?cloneFrom=${encodeURIComponent(r.id)}`)
            )
          }
          onDelete={(r) => setRuleToDelete(r)}
          onToggleEnabled={(r) => toggleEnabledMutation.mutate({ id: r.id, enabled: !r.enabled })}
        />
      ),
    },
  ];

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.rulesList.pageTitle"
            defaultMessage="Alerting V2 Rules"
          />
        }
        rightSideItems={[
          <EuiButton
            key="create-rule"
            onClick={() => navigateToUrl(basePath.prepend(paths.ruleCreate))}
            data-test-subj="createRuleButton"
          >
            <FormattedMessage
              id="xpack.alertingV2.rulesList.createRuleButton"
              defaultMessage="Create rule"
            />
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="m" />
      {isError ? (
        <>
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.alertingV2.rulesList.loadErrorTitle"
                defaultMessage="Failed to load rules"
              />
            }
            color="danger"
            iconType="error"
          >
            {error instanceof Error ? error.message : String(error)}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      {data && !isError ? (
        <>
          <EuiText size="xs" data-test-subj="rulesListShowingLabel">
            <FormattedMessage
              id="xpack.alertingV2.rulesList.showingLabel"
              defaultMessage="Showing {rangeBold} of {totalBold}"
              values={{
                rangeBold: (
                  <strong>
                    {Math.min((page - 1) * perPage + 1, data.total)}-
                    {Math.min(page * perPage, data.total)}
                  </strong>
                ),
                totalBold: (
                  <strong>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.showingLabelTotal"
                      defaultMessage="{total} {total, plural, one {Rule} other {Rules}}"
                      values={{ total: data.total }}
                    />
                  </strong>
                ),
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EuiHorizontalRule margin="none" style={{ height: 2 }} />
        </>
      ) : null}
      <EuiBasicTable
        items={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        onChange={onTableChange}
        responsiveBreakpoint={false}
        tableCaption={i18n.translate('xpack.alertingV2.rulesList.tableCaption', {
          defaultMessage: 'Rules',
        })}
        data-test-subj="rulesListTable"
      />
      {ruleToDelete ? (
        <DeleteConfirmationModal
          ruleName={ruleToDelete.metadata?.name ?? ruleToDelete.id}
          onCancel={() => setRuleToDelete(null)}
          onConfirm={onDeleteConfirm}
          isLoading={deleteRuleMutation.isLoading}
        />
      ) : null}
    </>
  );
};

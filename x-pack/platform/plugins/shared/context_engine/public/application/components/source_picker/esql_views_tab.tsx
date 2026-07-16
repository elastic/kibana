/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EsqlView } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';

interface EsqlViewsTabProps {
  views: EsqlView[];
  isLoading: boolean;
  selectedIds: ReadonlySet<string>;
  onToggle: (view: EsqlView) => void;
}

const CREATE_ESQL_VIEW_REQUEST = `PUT _query/view/my_esql_view
{
  "query": "FROM my-index-* | LIMIT 100"
}`;

const EsqlViewRow = ({
  view,
  isSelected,
  onToggle,
}: {
  view: EsqlView;
  isSelected: boolean;
  onToggle: (view: EsqlView) => void;
}) => {
  const toggleLabel = isSelected
    ? i18n.translate('xpack.contextEngine.sourcePicker.esqlViews.removeAriaLabel', {
        defaultMessage: 'Remove {name}',
        values: { name: view.name },
      })
    : i18n.translate('xpack.contextEngine.sourcePicker.esqlViews.addAriaLabel', {
        defaultMessage: 'Add {name}',
        values: { name: view.name },
      });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={`contextEsqlViewRow-${view.name}`}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="editorCodeBlock" size="l" aria-hidden={true} />
        </EuiFlexItem>
        {/* minWidth: 0 lets the flex item shrink so long queries truncate instead of overflowing the panel */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate">
            <strong>{view.name}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {i18n.translate('xpack.contextEngine.sourcePicker.esqlViews.queryPrefix', {
              defaultMessage: 'ES|QL · {query}',
              values: { query: view.query },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={isSelected ? 'check' : 'plusInCircle'}
              color={isSelected ? 'success' : 'primary'}
              onClick={() => onToggle(view)}
              data-test-subj={`contextAddEsqlViewButton-${view.name}`}
              aria-label={toggleLabel}
              aria-pressed={isSelected}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const EsqlViewsTab = ({ views, isLoading, selectedIds, onToggle }: EsqlViewsTabProps) => {
  const {
    services: { application, share, console: consolePlugin },
  } = useKibana();

  if (isLoading) {
    return <EuiSkeletonText lines={3} data-test-subj="contextEsqlViewsLoading" />;
  }

  return (
    <>
      {views.length === 0 ? (
        <EuiEmptyPrompt
          iconType="editorCodeBlock"
          titleSize="xs"
          data-test-subj="contextEsqlViewsEmpty"
          title={
            <h3>
              {i18n.translate('xpack.contextEngine.sourcePicker.esqlViews.emptyTitle', {
                defaultMessage: 'No ES|QL views found',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.contextEngine.sourcePicker.esqlViews.emptyBody', {
                defaultMessage: 'Create an ES|QL view to build context from a reusable query.',
              })}
            </p>
          }
        />
      ) : (
        views.map((view) => (
          <React.Fragment key={view.name}>
            <EsqlViewRow view={view} isSelected={selectedIds.has(view.name)} onToggle={onToggle} />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))
      )}
      <EuiSpacer size="s" />
      <TryInConsoleButton
        type="emptyButton"
        iconType="plusInCircle"
        request={CREATE_ESQL_VIEW_REQUEST}
        application={application}
        sharePlugin={share}
        consolePlugin={consolePlugin}
        data-test-subj="contextCreateEsqlViewButton"
        content={i18n.translate('xpack.contextEngine.sourcePicker.esqlViews.createButton', {
          defaultMessage: 'Create a new ES|QL view',
        })}
      />
    </>
  );
};

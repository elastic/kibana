/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiForm,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { DragHandleProps, DropResult } from '../../../../../common/eui_draggable';

import { AddLogColumnButtonAndPopover } from './add_log_column_popover';
import {
  FieldLogColumnConfigurationProps,
  LogColumnConfigurationProps,
} from './log_columns_configuration_form_state';
import { LogColumnConfiguration } from '../../utils/source_configuration';

interface LogColumnsConfigurationPanelProps {
  availableFields: string[];
  isLoading: boolean;
  logColumnConfiguration: LogColumnConfigurationProps[];
  addLogColumn: (logColumn: LogColumnConfiguration) => void;
  moveLogColumn: (sourceIndex: number, destinationIndex: number) => void;
}

export const LogColumnsConfigurationPanel: React.FunctionComponent<LogColumnsConfigurationPanelProps> = ({
  addLogColumn,
  moveLogColumn,
  availableFields,
  isLoading,
  logColumnConfiguration,
}) => {
  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) =>
      destination && moveLogColumn(source.index, destination.index),
    [moveLogColumn]
  );

  return (
    <EuiForm>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="sourceConfigurationLogColumnsSectionTitle">
            <h3>
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.logColumnsSectionTitle"
                defaultMessage="Log Columns"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddLogColumnButtonAndPopover
            addLogColumn={addLogColumn}
            availableFields={availableFields}
            isDisabled={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {logColumnConfiguration.length > 0 ? (
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="COLUMN_CONFIG_DROPPABLE_AREA">
            <>
              {/* Fragment here necessary for typechecking */}
              {logColumnConfiguration.map((column, index) => (
                <EuiDraggable
                  key={`logColumnConfigurationPanel-${column.logColumnConfiguration.id}`}
                  index={index}
                  draggableId={column.logColumnConfiguration.id}
                  customDragHandle
                >
                  {provided => (
                    <LogColumnConfigurationPanel
                      dragHandleProps={provided.dragHandleProps}
                      logColumnConfigurationProps={column}
                    />
                  )}
                </EuiDraggable>
              ))}
            </>
          </EuiDroppable>
        </EuiDragDropContext>
      ) : (
        <LogColumnConfigurationEmptyPrompt />
      )}
    </EuiForm>
  );
};

interface LogColumnConfigurationPanelProps {
  logColumnConfigurationProps: LogColumnConfigurationProps;
  dragHandleProps: DragHandleProps;
}

const LogColumnConfigurationPanel: React.FunctionComponent<LogColumnConfigurationPanelProps> = props => (
  <>
    <EuiSpacer size="m" />
    {props.logColumnConfigurationProps.type === 'timestamp' ? (
      <TimestampLogColumnConfigurationPanel {...props} />
    ) : props.logColumnConfigurationProps.type === 'message' ? (
      <MessageLogColumnConfigurationPanel {...props} />
    ) : (
      <FieldLogColumnConfigurationPanel
        logColumnConfigurationProps={props.logColumnConfigurationProps}
        dragHandleProps={props.dragHandleProps}
      />
    )}
  </>
);

const TimestampLogColumnConfigurationPanel: React.FunctionComponent<LogColumnConfigurationPanelProps> = ({
  logColumnConfigurationProps,
  dragHandleProps,
}) => (
  <ExplainedLogColumnConfigurationPanel
    fieldName="Timestamp"
    helpText={
      <FormattedMessage
        tagName="span"
        id="xpack.infra.sourceConfiguration.timestampLogColumnDescription"
        defaultMessage="This system field shows the log entry's time as determined by the {timestampSetting} field setting."
        values={{
          timestampSetting: <code>timestamp</code>,
        }}
      />
    }
    removeColumn={logColumnConfigurationProps.remove}
    dragHandleProps={dragHandleProps}
  />
);

const MessageLogColumnConfigurationPanel: React.FunctionComponent<LogColumnConfigurationPanelProps> = ({
  logColumnConfigurationProps,
  dragHandleProps,
}) => (
  <ExplainedLogColumnConfigurationPanel
    fieldName="Message"
    helpText={
      <FormattedMessage
        tagName="span"
        id="xpack.infra.sourceConfiguration.messageLogColumnDescription"
        defaultMessage="This system field shows the log entry message as derived from the document fields."
      />
    }
    removeColumn={logColumnConfigurationProps.remove}
    dragHandleProps={dragHandleProps}
  />
);

const FieldLogColumnConfigurationPanel: React.FunctionComponent<{
  logColumnConfigurationProps: FieldLogColumnConfigurationProps;
  dragHandleProps: DragHandleProps;
}> = ({
  logColumnConfigurationProps: {
    logColumnConfiguration: { field },
    remove,
  },
  dragHandleProps,
}) => {
  const fieldLogColumnTitle = i18n.translate(
    'xpack.infra.sourceConfiguration.fieldLogColumnTitle',
    {
      defaultMessage: 'Field',
    }
  );
  return (
    <EuiPanel data-test-subj={`logColumnPanel fieldLogColumnPanel fieldLogColumnPanel:${field}`}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <div data-test-subj="moveLogColumnHandle" {...dragHandleProps}>
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>{fieldLogColumnTitle}</EuiFlexItem>
        <EuiFlexItem grow={3}>
          <code>{field}</code>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RemoveLogColumnButton
            onClick={remove}
            columnDescription={`${fieldLogColumnTitle} - ${field}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const ExplainedLogColumnConfigurationPanel: React.FunctionComponent<{
  fieldName: React.ReactNode;
  helpText: React.ReactNode;
  removeColumn: () => void;
  dragHandleProps: DragHandleProps;
}> = ({ fieldName, helpText, removeColumn, dragHandleProps }) => (
  <EuiPanel
    data-test-subj={`logColumnPanel systemLogColumnPanel systemLogColumnPanel:${fieldName}`}
  >
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <div data-test-subj="moveLogColumnHandle" {...dragHandleProps}>
          <EuiIcon type="grab" />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>{fieldName}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiText size="s" color="subdued">
          {helpText}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RemoveLogColumnButton onClick={removeColumn} columnDescription={String(fieldName)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const RemoveLogColumnButton: React.FunctionComponent<{
  onClick?: () => void;
  columnDescription: string;
}> = ({ onClick, columnDescription }) => {
  const removeColumnLabel = i18n.translate(
    'xpack.infra.sourceConfiguration.removeLogColumnButtonLabel',
    {
      defaultMessage: 'Remove {columnDescription} column',
      values: { columnDescription },
    }
  );

  return (
    <EuiButtonIcon
      color="danger"
      data-test-subj="removeLogColumnButton"
      iconType="trash"
      onClick={onClick}
      title={removeColumnLabel}
      aria-label={removeColumnLabel}
    />
  );
};

const LogColumnConfigurationEmptyPrompt: React.FunctionComponent = () => (
  <EuiEmptyPrompt
    iconType="list"
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.noLogColumnsTitle"
          defaultMessage="No columns"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.noLogColumnsDescription"
          defaultMessage="Add a column to this list using the button above."
        />
      </p>
    }
  />
);

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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import React from 'react';

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
  reorderLogColumns: (sourceIndex: number, destinationIndex: number) => void;
}

export const LogColumnsConfigurationPanel: React.FunctionComponent<
  LogColumnsConfigurationPanelProps
> = ({ addLogColumn, reorderLogColumns, availableFields, isLoading, logColumnConfiguration }) => (
  <EuiForm>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="s" data-test-subj="sourceConfigurationLogColumnsSectionTitle">
          <h3>
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logColumnsSectionTitle"
              defaultMessage="Columns"
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
      <EuiDragDropContext
        onDragEnd={({ source, destination }) =>
          destination && reorderLogColumns(source.index, destination.index)
        }
      >
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

interface LogColumnConfigurationPanelProps {
  logColumnConfigurationProps: LogColumnConfigurationProps;
  dragHandleProps: any;
}

const LogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps
> = props => (
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

const TimestampLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps
> = ({ logColumnConfigurationProps, dragHandleProps }) => (
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

const MessageLogColumnConfigurationPanel: React.FunctionComponent<
  LogColumnConfigurationPanelProps
> = ({ logColumnConfigurationProps, dragHandleProps }) => (
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
  dragHandleProps: any;
}> = ({
  logColumnConfigurationProps: {
    logColumnConfiguration: { field },
    remove,
  },
  dragHandleProps,
}) => (
  <EuiPanel data-test-subj={`logColumnPanel fieldLogColumnPanel fieldLogColumnPanel:${field}`}>
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <div {...dragHandleProps}>
          <EuiIcon type="grab" />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.fieldLogColumnTitle"
          defaultMessage="Field"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <code>{field}</code>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RemoveLogColumnButton onClick={remove} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const ExplainedLogColumnConfigurationPanel: React.FunctionComponent<{
  fieldName: React.ReactNode;
  helpText: React.ReactNode;
  removeColumn: () => void;
  dragHandleProps: any;
}> = ({ fieldName, helpText, removeColumn, dragHandleProps }) => (
  <EuiPanel
    data-test-subj={`logColumnPanel systemLogColumnPanel systemLogColumnPanel:${fieldName}`}
  >
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <div {...dragHandleProps}>
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
        <RemoveLogColumnButton onClick={removeColumn} />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const RemoveLogColumnButton = injectI18n<{
  onClick?: () => void;
}>(({ intl, onClick }) => {
  const removeColumnLabel = intl.formatMessage({
    id: 'xpack.infra.sourceConfiguration.removeLogColumnButtonLabel',
    defaultMessage: 'Remove this column',
  });

  return (
    <EuiButtonIcon
      aria-label={removeColumnLabel}
      color="danger"
      data-test-subj="removeLogColumnButton"
      iconType="trash"
      onClick={onClick}
      title={removeColumnLabel}
    />
  );
});

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

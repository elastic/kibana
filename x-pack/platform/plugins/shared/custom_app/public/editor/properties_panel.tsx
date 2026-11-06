/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  MAX_HEADING_LENGTH,
  MAX_TEXT_LENGTH,
  OPTIONS_SOURCE_SUFFIX,
  collectSources,
  getNodeChildren,
  setStateDeclaration,
  updateNode,
  type AppDocument,
  type AppNode,
  type AppNodeOfType,
  type AppNodeType,
  type DocumentIssue,
} from '@kbn/custom-app-common';
import { getCatalogEntry } from './node_catalog';
import { InterpolatedTextField, SelectField, TextField } from './fields/fields';
import { DEFAULT_QUERY } from './node_defaults';
import { ColumnsEditor, OptionsEditor } from './fields/list_editors';
import { DataSourceField } from './fields/data_source_field';
import { QueryField } from './fields/query_field';
import { RowClickEditor } from './fields/row_click_editor';
import { ButtonActionsEditor } from './fields/workflow_action_editor';
import { FormFieldsEditor } from './fields/form_fields_editor';
import { TemplateField } from './fields/template_field';
import { Section } from './fields/section';
import { GenericNodeForm } from './fields/generic_node_form';

export type UpdateNode = <T extends AppNodeType>(
  props: Partial<Omit<AppNodeOfType<T>, 'id' | 'type' | 'children'>>
) => void;

interface PropertiesPanelProps {
  node: AppNode;
  document: AppDocument;
  issues: readonly DocumentIssue[];
  onChange: UpdateNode;
  /** Replaces the document with an edited copy, for edits that reach beyond the component. */
  onEdit: (change: (document: AppDocument) => AppDocument, coalesceKey?: string) => void;
}

const collectFlyoutIds = (root: AppNode): string[] => [
  ...(root.type === 'flyout' ? [root.id] : []),
  ...getNodeChildren(root).flatMap(collectFlyoutIds),
];

const labels = {
  text: i18n.translate('xpack.customApp.editor.fieldText', { defaultMessage: 'Text' }),
  title: i18n.translate('xpack.customApp.editor.fieldTitle', { defaultMessage: 'Title' }),
  label: i18n.translate('xpack.customApp.editor.fieldLabel', { defaultMessage: 'Label' }),
  startsAs: i18n.translate('xpack.customApp.editor.fieldStartsAs', { defaultMessage: 'Starts as' }),
  chartType: i18n.translate('xpack.customApp.editor.fieldChartType', {
    defaultMessage: 'Chart type',
  }),
};

const chartTypeOptions = [
  {
    value: 'auto' as const,
    text: i18n.translate('xpack.customApp.editor.chartTypeAuto', {
      defaultMessage: 'Automatic',
    }),
  },
  {
    value: 'bar' as const,
    text: i18n.translate('xpack.customApp.editor.chartTypeBar', { defaultMessage: 'Bar' }),
  },
  {
    value: 'line' as const,
    text: i18n.translate('xpack.customApp.editor.chartTypeLine', { defaultMessage: 'Line' }),
  },
  {
    value: 'area' as const,
    text: i18n.translate('xpack.customApp.editor.chartTypeArea', { defaultMessage: 'Area' }),
  },
  {
    value: 'donut' as const,
    text: i18n.translate('xpack.customApp.editor.chartTypeDonut', { defaultMessage: 'Donut' }),
  },
];

const sections = {
  content: i18n.translate('xpack.customApp.editor.sectionContent', { defaultMessage: 'Content' }),
  data: i18n.translate('xpack.customApp.editor.sectionData', { defaultMessage: 'Data' }),
  columns: i18n.translate('xpack.customApp.editor.sectionColumns', { defaultMessage: 'Columns' }),
  timeRange: i18n.translate('xpack.customApp.editor.sectionTimeRange', {
    defaultMessage: 'Period',
  }),
  whenPressed: i18n.translate('xpack.customApp.editor.sectionWhenPressed', {
    defaultMessage: 'When it is pressed',
  }),
  questions: i18n.translate('xpack.customApp.editor.sectionQuestions', {
    defaultMessage: 'Questions',
  }),
  whenSubmitted: i18n.translate('xpack.customApp.editor.sectionWhenSubmitted', {
    defaultMessage: 'When it is submitted',
  }),
  linkTarget: i18n.translate('xpack.customApp.editor.sectionLinkTarget', {
    defaultMessage: 'Where it goes',
  }),
  chartClick: i18n.translate('xpack.customApp.editor.sectionChartClick', {
    defaultMessage: 'When a bar, point or slice is clicked',
  }),
  rowClick: i18n.translate('xpack.customApp.editor.sectionRowClick', {
    defaultMessage: 'When a row is clicked',
  }),
  options: i18n.translate('xpack.customApp.editor.sectionOptions', { defaultMessage: 'Options' }),
  value: i18n.translate('xpack.customApp.editor.sectionValue', {
    defaultMessage: 'What it sets',
  }),
  template: i18n.translate('xpack.customApp.editor.sectionTemplate', {
    defaultMessage: 'Template',
  }),
  layout: i18n.translate('xpack.customApp.editor.sectionLayout', { defaultMessage: 'Layout' }),
};

/** A stack of sections, with room between them. */
const Sections = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
    {React.Children.toArray(children).map((child, index) => (
      <EuiFlexItem grow={false} key={index}>
        {child}
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

export const PropertiesPanel = ({
  node,
  document,
  issues,
  onChange,
  onEdit,
}: PropertiesPanelProps) => {
  const stateKeys = Object.keys(document.state);
  const entry = getCatalogEntry(node.type);

  /** What an input shows before anyone has used it, which is the default of the value it sets. */
  const startsAs = (bind: string, options?: ReadonlyArray<{ value: string; label?: string }>) => {
    const declaration = document.state[bind];
    const value = declaration?.type === 'string' ? declaration.default : '';
    const set = (next: string) =>
      onEdit(
        (current) => setStateDeclaration(current, bind, { type: 'string', default: next }),
        `startsAs:${bind}`
      );

    return options ? (
      <SelectField
        label={labels.startsAs}
        value={value}
        options={options.map((option) => ({
          value: option.value,
          text: option.label ?? option.value,
        }))}
        onChange={set}
      />
    ) : (
      <TextField label={labels.startsAs} value={value} onChange={set} />
    );
  };

  /** The name queries use for the value an input sets, since authors cannot guess it. */
  const valueName = (bind: string) =>
    bind === '' ? null : (
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.customApp.editor.valueName', {
            defaultMessage: 'Queries use this value as ?{name}',
            values: { name: bind },
          })}
        </p>
      </EuiText>
    );

  const form = (() => {
    switch (node.type) {
      case 'heading':
        return (
          <Section title={sections.content}>
            <InterpolatedTextField
              label={labels.text}
              value={node.text}
              maxLength={MAX_HEADING_LENGTH}
              stateKeys={stateKeys}
              onChange={(text) => onChange<'heading'>({ text })}
            />
          </Section>
        );
      case 'text':
        return (
          <Section title={sections.content}>
            <InterpolatedTextField
              multiline
              label={labels.text}
              value={node.text}
              maxLength={MAX_TEXT_LENGTH}
              stateKeys={stateKeys}
              onChange={(text) => onChange<'text'>({ text })}
            />
          </Section>
        );
      case 'callout':
        return (
          <Section title={sections.content}>
            <InterpolatedTextField
              label={labels.title}
              value={node.title}
              maxLength={MAX_HEADING_LENGTH}
              stateKeys={stateKeys}
              onChange={(title) => onChange<'callout'>({ title })}
            />
            <InterpolatedTextField
              multiline
              label={labels.text}
              value={node.text ?? ''}
              maxLength={MAX_TEXT_LENGTH}
              stateKeys={stateKeys}
              onChange={(text) => onChange<'callout'>({ text: text || undefined })}
            />
            <SelectField
              label={i18n.translate('xpack.customApp.editor.fieldKind', {
                defaultMessage: 'Kind',
              })}
              value={node.color}
              options={[
                {
                  value: 'primary' as const,
                  text: i18n.translate('xpack.customApp.editor.colorInfo', {
                    defaultMessage: 'Information',
                  }),
                },
                {
                  value: 'success' as const,
                  text: i18n.translate('xpack.customApp.editor.colorSuccess', {
                    defaultMessage: 'Success',
                  }),
                },
                {
                  value: 'warning' as const,
                  text: i18n.translate('xpack.customApp.editor.colorWarning', {
                    defaultMessage: 'Warning',
                  }),
                },
                {
                  value: 'danger' as const,
                  text: i18n.translate('xpack.customApp.editor.colorDanger', {
                    defaultMessage: 'Problem',
                  }),
                },
              ]}
              onChange={(color) => onChange<'callout'>({ color })}
            />
          </Section>
        );
      case 'stat':
        return (
          <Sections>
            <Section title={sections.content}>
              <InterpolatedTextField
                label={labels.title}
                value={node.title}
                maxLength={MAX_HEADING_LENGTH}
                stateKeys={stateKeys}
                onChange={(title) => onChange<'stat'>({ title })}
              />
            </Section>
            <Section title={sections.data}>
              <DataSourceField
                query={node.query}
                source={node.source}
                state={document.state}
                canCount
                onChange={(data) => onChange<'stat'>(data)}
              />
            </Section>
          </Sections>
        );
      case 'chart':
        return (
          <Sections>
            <Section title={sections.content}>
              <InterpolatedTextField
                label={labels.title}
                value={node.title ?? ''}
                maxLength={MAX_HEADING_LENGTH}
                stateKeys={stateKeys}
                onChange={(title) => onChange<'chart'>({ title: title === '' ? undefined : title })}
              />
              <EuiSpacer size="s" />
              <SelectField<'auto' | NonNullable<AppNodeOfType<'chart'>['chartType']>>
                label={labels.chartType}
                value={node.chartType ?? 'auto'}
                options={chartTypeOptions}
                onChange={(chartType) =>
                  onChange<'chart'>({ chartType: chartType === 'auto' ? undefined : chartType })
                }
              />
            </Section>
            <Section title={sections.data}>
              <QueryField
                query={node.query}
                state={document.state}
                onChange={(query) => onChange<'chart'>({ query })}
              />
            </Section>
            <Section title={sections.chartClick}>
              <RowClickEditor
                nodeId={node.id}
                nodeType="chart"
                actions={node.onClick}
                document={document}
                flyoutIds={collectFlyoutIds(document.root)}
                onEdit={onEdit}
              />
            </Section>
          </Sections>
        );
      case 'custom_content':
        return (
          <Sections>
            <Section title={sections.template}>
              <TemplateField
                value={node.template ?? ''}
                onChange={(template) => onChange<'custom_content'>({ template })}
              />
            </Section>
            <Section title={sections.data}>
              <EuiSwitch
                label={i18n.translate('xpack.customApp.editor.fillWithData', {
                  defaultMessage: 'Fill the template with the rows of a query',
                })}
                checked={node.query !== undefined}
                onChange={(event) =>
                  onChange<'custom_content'>({
                    query: event.target.checked ? DEFAULT_QUERY : undefined,
                  })
                }
              />
              {node.query !== undefined && (
                <>
                  <EuiSpacer size="s" />
                  <QueryField
                    query={node.query}
                    state={document.state}
                    onChange={(query) => onChange<'custom_content'>({ query })}
                  />
                </>
              )}
            </Section>
          </Sections>
        );
      case 'time_range':
        return (
          <Sections>
            <Section title={sections.timeRange}>
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.customApp.editor.timeRangeHelp', {
                    defaultMessage:
                      "Lets people change the period the whole app shows. Put it where you want it, among the filters for instance. An app has one. In a dashboard it sets the period of this panel, in place of the dashboard's.",
                  })}
                </p>
              </EuiText>
            </Section>
          </Sections>
        );
      case 'button':
        return (
          <Sections>
            <Section title={sections.content}>
              <TextField
                label={labels.label}
                value={node.label}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(label) => onChange<'button'>({ label })}
              />
            </Section>
            <Section title={sections.whenPressed}>
              <ButtonActionsEditor
                actions={node.onClick}
                stateKeys={stateKeys}
                onChange={(onClick) => onChange<'button'>({ onClick })}
              />
            </Section>
          </Sections>
        );
      case 'form':
        return (
          <Sections>
            <Section title={sections.content}>
              <TextField
                label={i18n.translate('xpack.customApp.editor.fieldSubmitLabel', {
                  defaultMessage: 'Submit button',
                })}
                value={node.submitLabel}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(submitLabel) => onChange<'form'>({ submitLabel })}
              />
            </Section>
            <Section title={sections.questions}>
              <FormFieldsEditor
                nodeId={node.id}
                fields={node.fields}
                onChange={(fields) => onChange<'form'>({ fields })}
                onEdit={onEdit}
              />
            </Section>
            <Section title={sections.whenSubmitted}>
              <ButtonActionsEditor
                actions={node.onSubmit}
                stateKeys={stateKeys}
                onChange={(onSubmit) => onChange<'form'>({ onSubmit })}
              />
            </Section>
          </Sections>
        );
      case 'table':
        return (
          <Sections>
            <Section title={sections.data}>
              <DataSourceField
                query={node.query}
                source={node.source}
                state={document.state}
                onChange={(data) => onChange<'table'>(data)}
              />
            </Section>
            <Section title={sections.columns}>
              <ColumnsEditor
                columns={node.columns}
                onChange={(columns) => onChange<'table'>({ columns })}
              />
            </Section>
            <Section title={sections.rowClick}>
              <RowClickEditor
                nodeId={node.id}
                actions={node.onRowClick}
                document={document}
                flyoutIds={collectFlyoutIds(document.root)}
                onEdit={onEdit}
              />
            </Section>
          </Sections>
        );
      case 'key_value':
        return (
          <Sections>
            <Section title={sections.data}>
              <DataSourceField
                query={node.query}
                source={node.source}
                state={document.state}
                onChange={(data) => onChange<'key_value'>(data)}
              />
              <EuiSpacer size="s" />
              <TextField
                label={i18n.translate('xpack.customApp.editor.fieldFields', {
                  defaultMessage: 'Fields to show',
                })}
                value={node.fields?.join(', ') ?? ''}
                placeholder={i18n.translate('xpack.customApp.editor.allFields', {
                  defaultMessage: 'All fields',
                })}
                helpText={i18n.translate('xpack.customApp.editor.fieldsHelp', {
                  defaultMessage: 'Column names, separated by commas.',
                })}
                onChange={(value) => {
                  const fields = value
                    .split(',')
                    .map((field) => field.trim())
                    .filter(Boolean);
                  onChange<'key_value'>({ fields: fields.length > 0 ? fields : undefined });
                }}
              />
            </Section>
          </Sections>
        );
      case 'select':
      case 'button_group':
        return (
          <Sections>
            <Section title={sections.content}>
              <TextField
                label={labels.label}
                value={node.label}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(label) => onChange<'select' | 'button_group'>({ label })}
              />
            </Section>
            <Section title={sections.options}>
              <OptionsEditor
                options={node.options}
                onChange={(options) => onChange<'select' | 'button_group'>({ options })}
              />
              {node.type === 'select' && (
                <>
                  <EuiSpacer size="m" />
                  <EuiSwitch
                    compressed
                    id={`multiple-${node.id}`}
                    label={i18n.translate('xpack.customApp.editor.selectMultiple', {
                      defaultMessage: 'Allow choosing several',
                    })}
                    checked={node.multiple === true}
                    onChange={(event) => {
                      const multiple = event.target.checked;
                      // What it sets changes with it: a list when several can be chosen, else a text.
                      onEdit((current) => {
                        const withValue = setStateDeclaration(
                          current,
                          node.bind,
                          multiple
                            ? { type: 'list', default: [] }
                            : { type: 'string', default: node.options[0]?.value ?? '' }
                        );
                        const result = updateNode<'select'>(withValue, node.id, {
                          multiple: multiple || undefined,
                        });
                        return result.ok ? result.document : current;
                      });
                    }}
                  />
                  <EuiSpacer size="s" />
                  <EuiSwitch
                    compressed
                    id={`options-query-${node.id}`}
                    label={i18n.translate('xpack.customApp.editor.optionsFromQuery', {
                      defaultMessage: 'Also take options from a query',
                    })}
                    checked={node.optionsQuery !== undefined}
                    onChange={(event) =>
                      onChange<'select'>({
                        optionsQuery: event.target.checked ? DEFAULT_QUERY : undefined,
                      })
                    }
                  />
                  {node.optionsQuery !== undefined && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs" color="subdued">
                        <p>
                          {i18n.translate('xpack.customApp.editor.optionsQueryHelp', {
                            defaultMessage:
                              'The first column is the value of an option and a second column, if there is one, its label. They come after the options written above, and follow the period of the app.',
                          })}
                        </p>
                      </EuiText>
                      <EuiSpacer size="s" />
                      <QueryField
                        query={node.optionsQuery}
                        state={document.state}
                        onChange={(optionsQuery) => onChange<'select'>({ optionsQuery })}
                      />
                    </>
                  )}
                </>
              )}
            </Section>
            <Section title={sections.value}>
              {node.type === 'select' && node.multiple
                ? null
                : startsAs(
                    node.bind,
                    node.type === 'select' && node.optionsQuery !== undefined
                      ? undefined
                      : node.options
                  )}
              {valueName(node.bind)}
            </Section>
          </Sections>
        );
      case 'link': {
        const dataComponents = Object.entries(collectSources(document.root)).flatMap(
          ([componentId, source]) =>
            source.type === 'esql' && !componentId.endsWith(OPTIONS_SOURCE_SUFFIX)
              ? [{ value: componentId, text: componentId }]
              : []
        );
        const { to } = node;
        return (
          <Sections>
            <Section title={sections.content}>
              <InterpolatedTextField
                label={labels.label}
                value={node.label}
                maxLength={MAX_HEADING_LENGTH}
                stateKeys={stateKeys}
                onChange={(label) => onChange<'link'>({ label })}
              />
            </Section>
            <Section title={sections.linkTarget}>
              <SelectField<'discover' | 'app' | 'custom_app'>
                label={i18n.translate('xpack.customApp.editor.linkGoesTo', {
                  defaultMessage: 'Goes to',
                })}
                value={to.type}
                options={[
                  {
                    value: 'discover',
                    text: i18n.translate('xpack.customApp.editor.linkDiscover', {
                      defaultMessage: 'The query of a component, in Discover',
                    }),
                  },
                  {
                    value: 'app',
                    text: i18n.translate('xpack.customApp.editor.linkApp', {
                      defaultMessage: 'A page of Kibana',
                    }),
                  },
                  {
                    value: 'custom_app',
                    text: i18n.translate('xpack.customApp.editor.linkCustomApp', {
                      defaultMessage: 'Another custom app',
                    }),
                  },
                ]}
                onChange={(type) =>
                  onChange<'link'>({
                    to:
                      type === 'discover'
                        ? { type, from: dataComponents[0]?.value ?? '' }
                        : type === 'app'
                        ? { type, app: 'dashboards' }
                        : { type, id: '' },
                  })
                }
              />
              {to.type === 'discover' && (
                <SelectField
                  label={i18n.translate('xpack.customApp.editor.linkQueryOf', {
                    defaultMessage: 'Opens the query of',
                  })}
                  value={to.from}
                  options={dataComponents}
                  placeholder={i18n.translate('xpack.customApp.editor.linkNoQuery', {
                    defaultMessage: 'No component with a query',
                  })}
                  onChange={(from) => onChange<'link'>({ to: { type: 'discover', from } })}
                />
              )}
              {to.type === 'app' && (
                <>
                  <TextField
                    label={i18n.translate('xpack.customApp.editor.linkAppId', {
                      defaultMessage: 'Application',
                    })}
                    value={to.app}
                    maxLength={100}
                    helpText={i18n.translate('xpack.customApp.editor.linkAppIdHelp', {
                      defaultMessage: 'Its id, such as dashboards or discover.',
                    })}
                    onChange={(app) => onChange<'link'>({ to: { ...to, app } })}
                  />
                  <InterpolatedTextField
                    label={i18n.translate('xpack.customApp.editor.linkPath', {
                      defaultMessage: 'Path',
                    })}
                    value={to.path ?? ''}
                    maxLength={500}
                    stateKeys={stateKeys}
                    onChange={(path) =>
                      onChange<'link'>({ to: { ...to, path: path === '' ? undefined : path } })
                    }
                  />
                </>
              )}
              {to.type === 'custom_app' && (
                <TextField
                  label={i18n.translate('xpack.customApp.editor.linkCustomAppId', {
                    defaultMessage: 'Id of the app',
                  })}
                  value={to.id}
                  maxLength={64}
                  onChange={(id) => onChange<'link'>({ to: { type: 'custom_app', id } })}
                />
              )}
            </Section>
          </Sections>
        );
      }
      case 'list_input':
        return (
          <Sections>
            <Section title={sections.content}>
              <TextField
                label={labels.label}
                value={node.label}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(label) => onChange<'list_input'>({ label })}
              />
              <TextField
                label={i18n.translate('xpack.customApp.editor.fieldPlaceholder', {
                  defaultMessage: 'Placeholder',
                })}
                value={node.placeholder ?? ''}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(placeholder) =>
                  onChange<'list_input'>({ placeholder: placeholder || undefined })
                }
              />
            </Section>
            <Section title={sections.value}>
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('xpack.customApp.editor.listValueHelp', {
                    defaultMessage:
                      'It sets a list, one value to a line. A query uses it as ?{name}, for example WHERE field IN (?{name}).',
                    values: { name: node.bind },
                  })}
                </p>
              </EuiText>
            </Section>
          </Sections>
        );
      case 'search':
        return (
          <Sections>
            <Section title={sections.content}>
              <TextField
                label={labels.label}
                value={node.label}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(label) => onChange<'search'>({ label })}
              />
              <TextField
                label={i18n.translate('xpack.customApp.editor.fieldPlaceholder', {
                  defaultMessage: 'Placeholder',
                })}
                value={node.placeholder ?? ''}
                maxLength={MAX_HEADING_LENGTH}
                onChange={(placeholder) =>
                  onChange<'search'>({ placeholder: placeholder || undefined })
                }
              />
            </Section>
            <Section title={sections.value}>
              {startsAs(node.bind)}
              {valueName(node.bind)}
            </Section>
          </Sections>
        );
      case 'stack':
        return (
          <Section title={sections.layout}>
            <SelectField
              label={i18n.translate('xpack.customApp.editor.fieldLayout', {
                defaultMessage: 'Layout',
              })}
              value={node.direction}
              options={[
                {
                  value: 'vertical' as const,
                  text: i18n.translate('xpack.customApp.editor.vertical', {
                    defaultMessage: 'Top to bottom',
                  }),
                },
                {
                  value: 'horizontal' as const,
                  text: i18n.translate('xpack.customApp.editor.horizontal', {
                    defaultMessage: 'Side by side',
                  }),
                },
              ]}
              onChange={(direction) => onChange<'stack'>({ direction })}
            />
          </Section>
        );
      case 'flyout':
        return (
          <Section title={sections.content}>
            <InterpolatedTextField
              label={labels.title}
              value={node.title}
              maxLength={MAX_HEADING_LENGTH}
              stateKeys={stateKeys}
              onChange={(title) => onChange<'flyout'>({ title })}
            />
          </Section>
        );
    }
  })();

  const nodeIssues = issues.filter(({ nodeId }) => nodeId === node.id);

  return (
    <div data-test-subj="customAppProperties">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiPanel
            color="primary"
            hasShadow={false}
            borderRadius="m"
            paddingSize="s"
            aria-hidden="true"
          >
            <EuiIcon type={entry.iconType} size="l" color="primary" aria-hidden="true" />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{entry.label}</h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>{node.id}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {nodeIssues.length > 0 && (
        <>
          <KbnDangerCallout
            announceOnMount={false}
            size="s"
            title={i18n.translate('xpack.customApp.editor.nodeIssues', {
              defaultMessage: 'This component needs attention',
            })}
          >
            <ul>
              {nodeIssues.map(({ message }) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </KbnDangerCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {form ?? <GenericNodeForm node={node} onEdit={onEdit} />}
    </div>
  );
};

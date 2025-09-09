/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';

import {
  EuiComboBox,
  EuiSwitch,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiTextArea,
  EuiHorizontalRule,
} from '@elastic/eui';

import { FILE_FORMATS, NO_TIME_FORMAT } from '@kbn/file-upload-common';

import {
  getFormatOptions,
  getTimestampFormatOptions,
  getDelimiterOptions,
  getQuoteOptions,
  // getCharsetOptions,
} from './options';
import { isTimestampFormatValid } from './overrides_validation';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { replaceFieldInGrokPattern } from '../../../../common/util/grok_pattern';
import {
  convertDelimiter,
  convertDelimiterBack,
  getColumnNames,
  getGrokFieldNames,
  isLinesToSampleValid,
  LINES_TO_SAMPLE_VALUE_MIN,
  LINES_TO_SAMPLE_VALUE_MAX,
} from './overrides_utils';

import { TIMESTAMP_OPTIONS, CUSTOM_DROPDOWN_OPTION } from './options/option_lists';

const formatOptions = getFormatOptions();
const timestampFormatOptions = getTimestampFormatOptions();
const delimiterOptions = getDelimiterOptions();
const quoteOptions = getQuoteOptions();

class OverridesUI extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  linesToSampleErrors = i18n.translate(
    'xpack.dataVisualizer.file.editFlyout.overrides.linesToSampleErrorMessage',
    {
      defaultMessage: 'Value must be greater than {min} and less than or equal to {max}',
      values: {
        min: LINES_TO_SAMPLE_VALUE_MIN,
        max: LINES_TO_SAMPLE_VALUE_MAX,
      },
    }
  );

  customTimestampFormatErrors = i18n.translate(
    'xpack.dataVisualizer.file.editFlyout.overrides.customTimestampFormatErrorMessage',
    {
      defaultMessage: `Timestamp format must be a combination of these Java date/time formats:
      yy, yyyy, M, MM, MMM, MMMM, d, dd, EEE, EEEE, H, HH, h, mm, ss, S through SSSSSSSSS, a, XX, XXX, zzz`,
    }
  );

  static getDerivedStateFromProps(props, state) {
    const { originalSettings } = props;

    const {
      charset,
      format,
      hasHeaderRow,
      columnNames,
      delimiter,
      quote,
      shouldTrimFields,
      grokPattern,
      timestampField,
      timestampFormat,
      linesToSample,
    } = props.overrides;

    const { delimiter: d, customDelimiter: customD } = convertDelimiter(
      delimiter === undefined ? originalSettings.delimiter : delimiter
    );

    const { newColumnNames, originalColumnNames } = getColumnNames(columnNames, originalSettings);

    const newGrokFieldNames = getGrokFieldNames(grokPattern, originalSettings.grokPattern);

    const overrides = {
      charset: charset === undefined ? originalSettings.charset : charset,
      format: format === undefined ? originalSettings.format : format,
      hasHeaderRow: hasHeaderRow === undefined ? originalSettings.hasHeaderRow : hasHeaderRow,
      columnNames: newColumnNames,
      grokFieldNames: newGrokFieldNames,
      delimiter: d,
      quote: quote === undefined ? originalSettings.quote : quote,
      shouldTrimFields:
        shouldTrimFields === undefined ? originalSettings.shouldTrimFields : shouldTrimFields,
      grokPattern: grokPattern === undefined ? originalSettings.grokPattern : grokPattern,
      timestampFormat:
        timestampFormat === undefined ? originalSettings.timestampFormat : timestampFormat,
      timestampField:
        timestampField === undefined ? originalSettings.timestampField : timestampField,
      linesToSample: linesToSample === undefined ? originalSettings.linesToSample : +linesToSample,
    };

    return {
      originalColumnNames,
      originalGrokFieldNames: newGrokFieldNames,
      customDelimiter: customD === undefined ? '' : customD,
      customTimestampFormat: '',
      linesToSampleValid: true,
      timestampFormatValid: true,
      timestampFormatError: null,
      containsTimeField: overrides.timestampFormat !== NO_TIME_FORMAT,
      overrides,
      ...state,
    };
  }

  componentDidMount() {
    const originalTimestampFormat =
      this.props && this.props.originalSettings && this.props.originalSettings.timestampFormat;

    if (typeof this.props.setApplyOverrides === 'function') {
      this.props.setApplyOverrides(this.applyOverrides);
    }

    if (originalTimestampFormat !== undefined) {
      const optionExists = TIMESTAMP_OPTIONS.some((option) => option === originalTimestampFormat);
      if (optionExists === false) {
        // Incoming format does not exist in dropdown. Display custom input with incoming format as default value.
        const overrides = { ...this.state.overrides };
        overrides.timestampFormat = CUSTOM_DROPDOWN_OPTION;
        this.setState({ customTimestampFormat: originalTimestampFormat, overrides });
      }
    }
  }

  componentWillUnmount() {
    if (typeof this.props.unsetApplyOverrides === 'function') {
      this.props.unsetApplyOverrides();
    }
  }

  applyOverrides = () => {
    const overrides = { ...this.state.overrides };
    overrides.delimiter = convertDelimiterBack(overrides.delimiter, this.state.customDelimiter);
    if (
      overrides.timestampFormat === CUSTOM_DROPDOWN_OPTION &&
      this.state.customTimestampFormat !== ''
    ) {
      overrides.timestampFormat = this.state.customTimestampFormat;
    }

    this.props.setOverrides(overrides);
  };

  setOverride(o) {
    const overrides = { ...this.state.overrides, ...o };
    this.setState({ overrides });
  }

  onFormatChange = ([opt]) => {
    const format = opt ? opt.label : '';
    this.setOverride({ format });
  };

  onTimestampFormatChange = ([opt]) => {
    const timestampFormat = opt ? opt.label : '';
    this.setOverride({ timestampFormat });
    if (opt !== CUSTOM_DROPDOWN_OPTION) {
      this.props.setOverridesValid(true);
    }
  };

  onCustomTimestampFormatChange = (e) => {
    this.setState({ customTimestampFormat: e.target.value });
    // check whether the value is valid and set that to state.
    const { isValid, errorMessage } = isTimestampFormatValid(e.target.value);
    this.setState({ timestampFormatValid: isValid, timestampFormatError: errorMessage });
    this.props.setOverridesValid(isValid);
  };

  onTimestampFieldChange = ([opt]) => {
    const timestampField = opt ? opt.label : '';
    this.setOverride({ timestampField });
  };

  onContainsTimeFieldChange = (e) => {
    this.setState({ containsTimeField: e.target.checked });
    if (e.target.checked === false) {
      this.setOverride({ timestampFormat: NO_TIME_FORMAT });
    } else {
      this.setOverride({
        timestampFormat: this.props.originalSettings.timestampFormat,
      });
    }
  };

  onDelimiterChange = ([opt]) => {
    const delimiter = opt ? opt.label : '';
    this.setOverride({ delimiter });
  };

  onCustomDelimiterChange = (e) => {
    this.setState({ customDelimiter: e.target.value });
  };

  onQuoteChange = ([opt]) => {
    const quote = opt ? opt.label : '';
    this.setOverride({ quote });
  };

  onHasHeaderRowChange = (e) => {
    this.setOverride({ hasHeaderRow: e.target.checked });
  };

  onShouldTrimFieldsChange = (e) => {
    this.setOverride({ shouldTrimFields: e.target.checked });
  };

  onCharsetChange = ([opt]) => {
    const charset = opt ? opt.label : '';
    this.setOverride({ charset });
  };

  onColumnNameChange = (e, i) => {
    const columnNames = this.state.overrides.columnNames;
    columnNames[i] = e.target.value;
    this.setOverride({ columnNames });
  };

  onGrokPatternFieldChange = (e, i) => {
    const name = e.target.value;
    const newGrokPattern = replaceFieldInGrokPattern(this.state.overrides.grokPattern, name, i);
    const newGrokFieldNames = getGrokFieldNames(newGrokPattern, this.state.overrides.grokPattern);
    this.setOverride({ grokPattern: newGrokPattern, grokFieldNames: newGrokFieldNames });
  };

  grokPatternChange = (e) => {
    const newGrokPattern = e.target.value;
    const newGrokFieldNames = getGrokFieldNames(newGrokPattern, this.state.overrides.grokPattern);
    this.setOverride({ grokPattern: newGrokPattern, grokFieldNames: newGrokFieldNames });
  };

  onLinesToSampleChange = (e) => {
    const linesToSample = +e.target.value;
    this.setOverride({ linesToSample });

    // check whether the value is valid and set that to state.
    const linesToSampleValid = isLinesToSampleValid(linesToSample);
    this.setState({ linesToSampleValid });

    // set the overrides valid setting in the parent component,
    // used to disable the Apply button if any of the overrides are invalid
    this.props.setOverridesValid(linesToSampleValid);
  };

  render() {
    const { fields } = this.props;
    const {
      customDelimiter,
      customTimestampFormat,
      originalColumnNames,
      originalGrokFieldNames,
      linesToSampleValid,
      timestampFormatError,
      timestampFormatValid,
      containsTimeField,
      overrides,
    } = this.state;

    const {
      timestampFormat,
      timestampField,
      format,
      delimiter,
      quote,
      hasHeaderRow,
      shouldTrimFields,
      // charset,
      columnNames,
      grokFieldNames,
      grokPattern,
      linesToSample,
    } = overrides;

    const fieldOptions = getSortedFields(fields);
    const timestampFormatErrorsList = [this.customTimestampFormatErrors, timestampFormatError];
    const docsUrl = this.props.kibana.services.docLinks.links.aggs.date_format_pattern;

    const timestampFormatHelp = (
      <EuiText size="xs">
        <EuiLink href={docsUrl} target="_blank">
          {i18n.translate(
            'xpack.dataVisualizer.file.editFlyout.overrides.timestampFormatHelpText',
            {
              defaultMessage: 'See more on accepted formats',
            }
          )}
        </EuiLink>
      </EuiText>
    );

    return (
      <EuiForm fullWidth>
        <SectionTitle>
          <FormattedMessage
            id="xpack.dataVisualizer.file.editFlyout.overrides.generalSettingsTitle"
            defaultMessage="General"
          />
        </SectionTitle>

        <EuiFormRow
          display="columnCompressed"
          error={this.linesToSampleErrors}
          isInvalid={linesToSampleValid === false}
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrides.linesToSampleFormRowLabel"
              defaultMessage="Number of lines to sample"
            />
          }
        >
          <EuiFieldNumber
            value={linesToSample}
            onChange={this.onLinesToSampleChange}
            isInvalid={linesToSampleValid === false}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          display="columnCompressed"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.editFlyout.overrides.dataFormatFormRowLabel"
              defaultMessage="Data format"
            />
          }
        >
          <EuiComboBox
            options={formatOptions}
            selectedOptions={selectedOption(format)}
            onChange={this.onFormatChange}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            compressed
          />
        </EuiFormRow>
        {format === FILE_FORMATS.DELIMITED && (
          <>
            <EuiFormRow
              display="columnCompressed"
              label={
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.delimiterFormRowLabel"
                  defaultMessage="Delimiter"
                />
              }
            >
              <EuiComboBox
                options={delimiterOptions}
                selectedOptions={selectedOption(delimiter)}
                onChange={this.onDelimiterChange}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                compressed
              />
            </EuiFormRow>
            {delimiter === CUSTOM_DROPDOWN_OPTION && (
              <EuiFormRow
                display="columnCompressed"
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrides.customDelimiterFormRowLabel"
                    defaultMessage="Custom delimiter"
                  />
                }
              >
                <EuiFieldText
                  value={customDelimiter}
                  onChange={this.onCustomDelimiterChange}
                  compressed
                />
              </EuiFormRow>
            )}

            <EuiFormRow
              display="columnCompressed"
              label={
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.quoteCharacterFormRowLabel"
                  defaultMessage="Quote character"
                />
              }
            >
              <EuiComboBox
                options={quoteOptions}
                selectedOptions={selectedOption(quote)}
                onChange={this.onQuoteChange}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                compressed
              />
            </EuiFormRow>

            <EuiFormRow display="columnCompressed">
              <EuiSwitch
                id={'hasHeaderRow'}
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrides.hasHeaderRowLabel"
                    defaultMessage="Has header row"
                  />
                }
                checked={hasHeaderRow}
                onChange={this.onHasHeaderRowChange}
                compressed
              />
            </EuiFormRow>

            <EuiFormRow display="columnCompressed">
              <EuiSwitch
                id={'shouldTrimFields'}
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrides.trimFieldsLabel"
                    defaultMessage="Should trim fields"
                  />
                }
                checked={shouldTrimFields}
                onChange={this.onShouldTrimFieldsChange}
                compressed
              />
            </EuiFormRow>
          </>
        )}
        {format === FILE_FORMATS.SEMI_STRUCTURED_TEXT && (
          <>
            <EuiFormRow
              display="columnCompressed"
              label={
                <FormattedMessage
                  id="xpack.dataVisualizer.file.editFlyout.overrides.grokPatternFormRowLabel"
                  defaultMessage="Grok pattern"
                />
              }
            >
              <EuiTextArea
                placeholder={grokPattern}
                value={grokPattern}
                onChange={this.grokPatternChange}
                compressed
              />
            </EuiFormRow>
          </>
        )}

        {format === FILE_FORMATS.DELIMITED || format === FILE_FORMATS.SEMI_STRUCTURED_TEXT ? (
          <>
            <EuiHorizontalRule />

            <SectionTitle>
              <FormattedMessage
                id="xpack.dataVisualizer.file.editFlyout.overrides.dateAndTimeTitle"
                defaultMessage="Date & Time"
              />
            </SectionTitle>

            <EuiFormRow display="columnCompressed">
              <EuiSwitch
                id={'containsTimeField'}
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrides.containsTimeFieldLabel"
                    defaultMessage="Contains time field"
                  />
                }
                checked={containsTimeField}
                onChange={this.onContainsTimeFieldChange}
                compressed
              />
            </EuiFormRow>

            {containsTimeField ? (
              <>
                <EuiFormRow
                  display="columnCompressed"
                  helpText={timestampFormatHelp}
                  label={
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.editFlyout.overrides.timestampFormatFormRowLabel"
                      defaultMessage="Timestamp format"
                    />
                  }
                >
                  <EuiComboBox
                    options={timestampFormatOptions}
                    selectedOptions={selectedOption(timestampFormat)}
                    onChange={this.onTimestampFormatChange}
                    singleSelection={{ asPlainText: true }}
                    isClearable={false}
                    compressed
                  />
                </EuiFormRow>
                {timestampFormat === CUSTOM_DROPDOWN_OPTION && (
                  <EuiFormRow
                    display="columnCompressed"
                    error={timestampFormatErrorsList}
                    isInvalid={timestampFormatValid === false}
                    label={
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.editFlyout.overrides.customTimestampFormatFormRowLabel"
                        defaultMessage="Custom timestamp format"
                      />
                    }
                  >
                    <EuiFieldText
                      value={customTimestampFormat}
                      onChange={this.onCustomTimestampFormatChange}
                      isInvalid={timestampFormatValid === false}
                      compressed
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow
                  display="columnCompressed"
                  label={
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.editFlyout.overrides.timeFieldFormRowLabel"
                      defaultMessage="Time field"
                    />
                  }
                >
                  <EuiComboBox
                    options={fieldOptions}
                    selectedOptions={selectedOption(timestampField)}
                    onChange={this.onTimestampFieldChange}
                    singleSelection={{ asPlainText: true }}
                    isClearable={false}
                    compressed
                  />
                </EuiFormRow>
              </>
            ) : null}
          </>
        ) : null}

        {format === FILE_FORMATS.DELIMITED && originalColumnNames.length > 0 && (
          <>
            <EuiHorizontalRule />

            <SectionTitle>
              <FormattedMessage
                id="xpack.dataVisualizer.file.editFlyout.overrides.editFieldNamesTitle"
                defaultMessage="Field names"
              />
            </SectionTitle>

            {originalColumnNames.map((f, i) => {
              const fieldName = columnNames[i];
              const isTimeField = fieldName === timestampField;
              let value = fieldName;
              if (isTimeField) {
                value = i18n.translate(
                  'xpack.dataVisualizer.file.editFlyout.overrides.timestampFieldInfo',
                  {
                    defaultMessage: 'Timestamp field cannot be renamed',
                  }
                );
              } else if (fieldName === f) {
                value = '';
              }
              return (
                <EuiFormRow key={f} fullWidth>
                  <EuiFieldText
                    value={value}
                    onChange={(e) => this.onColumnNameChange(e, i)}
                    compressed
                    disabled={isTimeField}
                    prepend={f}
                    placeholder={i18n.translate(
                      'xpack.dataVisualizer.file.editFlyout.overrides.fieldNamePlaceholder',
                      {
                        defaultMessage: 'Change field name',
                      }
                    )}
                    fullWidth
                  />
                </EuiFormRow>
              );
            })}
          </>
        )}

        {format === FILE_FORMATS.SEMI_STRUCTURED_TEXT && originalGrokFieldNames.length > 0 && (
          <>
            <EuiHorizontalRule />

            <SectionTitle>
              <FormattedMessage
                id="xpack.dataVisualizer.file.editFlyout.overrides.editFieldNamesTitle"
                defaultMessage="Field names"
              />
            </SectionTitle>

            {originalGrokFieldNames.map((f, i) => {
              const fieldName = grokFieldNames[i];
              const value = fieldName === f ? '' : fieldName;
              return (
                <EuiFormRow key={f}>
                  <EuiFieldText
                    value={value}
                    onChange={(e) => this.onGrokPatternFieldChange(e, i, grokPattern)}
                    compressed
                    prepend={f}
                    placeholder={i18n.translate(
                      'xpack.dataVisualizer.file.editFlyout.overrides.fieldNamePlaceholder',
                      {
                        defaultMessage: 'Change field name',
                      }
                    )}
                  />
                </EuiFormRow>
              );
            })}
          </>
        )}
      </EuiForm>
    );
  }
}

function SectionTitle({ children }) {
  return (
    <>
      <EuiTitle size="xs">
        <h3>{children}</h3>
      </EuiTitle>

      <EuiSpacer size="m" />
    </>
  );
}

export const Overrides = withKibana(OverridesUI);

function selectedOption(opt) {
  return [{ label: opt || '' }];
}

// return a list of objects compatible with EuiComboBox
// also sort alphanumerically
function getSortedFields(fields) {
  return fields
    .map((f) => ({ label: f }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

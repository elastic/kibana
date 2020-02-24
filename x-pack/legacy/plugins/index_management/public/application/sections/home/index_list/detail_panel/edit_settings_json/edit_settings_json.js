/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationService } from '../../../../../services/documentation';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { TAB_SETTINGS } from '../../../../../constants';
import { settingsToDisplay, readOnlySettings } from '../../../../../lib/edit_settings';
import { createAceEditor } from '../../../../../lib/ace';
import _ from 'lodash';

import { flattenObject } from '../../../../../lib/flatten_object';

export class EditSettingsJson extends React.PureComponent {
  constructor() {
    super();
    this.state = {
      valid: true,
    };
  }

  //API expects settings in flattened dotted form,
  //whereas they come back as nested objects from ES
  transformSettingsForApi(data, isOpen) {
    const { defaults, settings } = data;
    //settings user has actually set
    const flattenedSettings = flattenObject(settings);
    //settings with their defaults
    const flattenedDefaults = flattenObject(defaults);
    const filteredDefaults = _.pick(flattenedDefaults, settingsToDisplay);
    const newSettings = { ...filteredDefaults, ...flattenedSettings };
    //store these to be used as autocomplete values later
    this.settingsKeys = Object.keys(newSettings);
    readOnlySettings.forEach(e => delete newSettings[e]);
    //can't change codec on open index
    if (isOpen) {
      delete newSettings['index.codec'];
    }
    return newSettings;
  }
  UNSAFE_componentWillMount() {
    const { indexName } = this.props;
    this.props.loadIndexData({ dataType: TAB_SETTINGS, indexName });
  }
  componentDidUpdate() {
    const { data, indexStatus } = this.props;
    if (data && !this.editor) {
      const isOpen = indexStatus === 'open';
      const newSettings = this.transformSettingsForApi(data, isOpen);
      this.originalSettings = newSettings;
      const prettyJson = JSON.stringify(newSettings, null, 2);
      const settingsKeys = Object.keys(newSettings);
      const editor = (this.editor = createAceEditor(this.aceDiv, prettyJson, false, settingsKeys));
      const session = editor.getSession();
      session.on('changeAnnotation', () => {
        const isEmptyString = session.getValue() === '';
        this.setState({ valid: !isEmptyString && session.getAnnotations().length === 0 });
      });
    }
  }
  componentWillUnmount() {
    this.editor && this.editor.destroy();
  }
  commitSettings = () => {
    const { updateIndexSettings, indexName } = this.props;
    const json = this.editor.getValue();
    const settings = JSON.parse(json);
    //don't set if the values have not changed
    Object.keys(this.originalSettings).forEach(key => {
      if (_.isEqual(this.originalSettings[key], settings[key])) {
        delete settings[key];
      }
    });
    updateIndexSettings({ indexName, settings });
  };
  errorMessage() {
    const { error } = this.props;
    if (!error) {
      return null;
    }
    return (
      <div>
        <EuiSpacer />
        <EuiIcon color="danger" type="alert" />
        <EuiTextColor color="danger">{error}</EuiTextColor>
        <EuiSpacer />
      </div>
    );
  }
  render() {
    const { data } = this.props;
    if (!data) {
      return null;
    }
    return (
      <div>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle>
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.editSettingsJSON.saveJSONDescription"
                  defaultMessage="Edit, then save your JSON"
                />
              </p>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              data-test-subj="updateEditIndexSettingsButton"
              onClick={this.commitSettings}
              disabled={!this.state.valid}
            >
              <FormattedMessage
                id="xpack.idxMgmt.editSettingsJSON.saveJSONButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiLink
          href={documentationService.getSettingsDocumentationLink()}
          target="_blank"
          rel="noopener"
        >
          <FormattedMessage
            id="xpack.idxMgmt.editSettingsJSON.settingsReferenceLinkText"
            defaultMessage="Settings reference"
          />
        </EuiLink>
        <EuiSpacer />
        <div
          data-test-subj="indexJsonEditor"
          ref={aceDiv => {
            this.aceDiv = aceDiv;
          }}
        />
        {this.errorMessage()}
        <EuiSpacer />
      </div>
    );
  }
}

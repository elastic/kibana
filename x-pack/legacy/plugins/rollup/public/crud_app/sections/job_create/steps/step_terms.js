/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { termsDetailsUrl } from '../../../services';

import { FieldList } from '../../components';

import { FieldChooser } from './components';

export class StepTermsUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    termsFields: PropTypes.array.isRequired,
  };

  onSelectField = field => {
    const {
      fields: { terms },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ terms: terms.concat(field) });
  };

  onRemoveField = field => {
    const {
      fields: { terms },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ terms: terms.filter(term => term !== field) });
  };

  render() {
    const { fields, termsFields } = this.props;

    const { terms } = fields;

    const columns = [
      {
        field: 'name',
        name: 'Field',
        sortable: true,
      },
      {
        field: 'type',
        name: 'Type',
        truncateText: true,
        sortable: true,
        width: '180px',
      },
    ];

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj="rollupJobCreateTermsTitle">
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepTermsTitle"
                  defaultMessage="Terms (optional)"
                />
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepTermsDescription"
                  defaultMessage="Select the fields you want to bucket using terms aggregations.
                    This can be costly for high-cardinality fields such as IP addresses,
                    if the time bucket is sparse."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false} className="rollupJobWizardStepActions">
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={termsDetailsUrl}
              target="_blank"
              iconType="help"
              data-test-subj="rollupJobCreateTermsDocsButton"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepTerms.readDocsButtonLabel"
                defaultMessage="Terms docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <FieldList
          columns={columns}
          fields={terms}
          onRemoveField={this.onRemoveField}
          emptyMessage={<p>No terms fields added</p>}
          addButton={
            <FieldChooser
              buttonLabel={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepTerms.fieldsChooserLabel"
                  defaultMessage="Add terms fields"
                />
              }
              columns={columns}
              fields={termsFields}
              selectedFields={terms}
              onSelectField={this.onSelectField}
              dataTestSubj="rollupJobTermsFieldChooser"
            />
          }
          dataTestSubj="rollupJobTermsFieldList"
        />
      </Fragment>
    );
  }
}

export const StepTerms = injectI18n(StepTermsUi);

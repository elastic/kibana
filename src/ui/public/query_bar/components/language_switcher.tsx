/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { documentationLinks } from '../../documentation_links/documentation_links';

const luceneQuerySyntaxDocs = documentationLinks.query.luceneQuerySyntax;
const kueryQuerySyntaxDocs = documentationLinks.query.kueryQuerySyntax;

interface State {
  isPopoverOpen: boolean;
}

interface Props {
  language: string;
  onSelectLanguage: (newLanguage: string) => void;
}

export class QueryLanguageSwitcher extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
    const button = (
      <EuiButtonEmpty size="xs" onClick={this.togglePopover}>
        <FormattedMessage id="common.ui.queryBar.optionsButtonLabel" defaultMessage="Options" />
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="popover"
        className="eui-displayBlock"
        ownFocus
        anchorPosition="downRight"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        withTitle
      >
        <EuiPopoverTitle>
          <FormattedMessage
            id="common.ui.queryBar.syntaxOptionsTitle"
            defaultMessage="Syntax options"
          />
        </EuiPopoverTitle>
        <div style={{ width: '350px' }}>
          <EuiText>
            <p>
              <FormattedMessage
                id="common.ui.queryBar.syntaxOptionsDescription"
                defaultMessage="Our new autocomplete and simple syntax features can help you create your
                queries. Just start typing and you’ll see matches related to your data. See docs {docsLink}."
                values={{
                  docsLink: (
                    <EuiLink href={kueryQuerySyntaxDocs} target="_blank">
                      <FormattedMessage
                        id="common.ui.queryBar.syntaxOptionsDescription.docsLinkText"
                        defaultMessage="here"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiForm>
            <EuiFormRow>
              <EuiSwitch
                id="queryEnhancementOptIn"
                name="popswitch"
                label={
                  <FormattedMessage
                    id="common.ui.queryBar.turnOnQueryFeaturesLabel"
                    defaultMessage="Turn on query features"
                  />
                }
                checked={this.props.language === 'kuery'}
                onChange={this.onSwitchChange}
                data-test-subj="languageToggle"
              />
            </EuiFormRow>
          </EuiForm>

          <EuiHorizontalRule margin="s" />

          <EuiText size="xs">
            <p>
              <FormattedMessage
                id="common.ui.queryBar.luceneDocsDescription"
                defaultMessage="Not ready yet? Find our lucene docs {docsLink}."
                values={{
                  docsLink: (
                    <EuiLink href={luceneQuerySyntaxDocs} target="_blank">
                      <FormattedMessage
                        id="common.ui.queryBar.luceneDocsDescription.docsLinkText"
                        defaultMessage="here"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </div>
      </EuiPopover>
    );
  }

  private togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  private onSwitchChange = () => {
    const newLanguage = this.props.language === 'lucene' ? 'kuery' : 'lucene';
    this.props.onSelectLanguage(newLanguage);
  };
}

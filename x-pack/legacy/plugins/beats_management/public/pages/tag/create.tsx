/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import 'brace/mode/yaml';
import 'brace/theme/github';
import { isEqual } from 'lodash';
import React from 'react';
import { UNIQUENESS_ENFORCING_TYPES } from '../../../common/constants/configuration_blocks';
import { BeatTag, ConfigurationBlock } from '../../../common/domain_types';
import { PrimaryLayout } from '../../components/layouts/primary';
import { TagEdit } from '../../components/tag';
import { AppPageProps } from '../../frontend_types';
import { randomEUIColor } from '../../utils/random_eui_color';

interface TagPageState {
  showFlyout: boolean;
  tag: BeatTag;
  configuration_blocks: ConfigurationBlock[];
  currentConfigPage: number;
}
class TagCreatePageComponent extends React.PureComponent<
  AppPageProps & {
    intl: InjectedIntl;
  },
  TagPageState
> {
  constructor(props: AppPageProps & { intl: InjectedIntl }) {
    super(props);

    this.state = {
      showFlyout: false,
      currentConfigPage: 0,
      tag: {
        id: '',
        name: '',
        color: randomEUIColor(euiVars),
        hasConfigurationBlocksTypes: [],
      },
      configuration_blocks: [],
    };
  }
  public render() {
    const { intl } = this.props;
    const blockStartingIndex = this.state.currentConfigPage * 5;
    return (
      <PrimaryLayout
        hideBreadcrumbs={this.props.libs.framework.versionGreaterThen('6.7.0')}
        title={intl.formatMessage({
          id: 'xpack.beatsManagement.tag.createTagTitle',
          defaultMessage: 'Create Tag',
        })}
      >
        <div>
          <TagEdit
            tag={this.state.tag}
            configuration_blocks={{
              list: this.state.configuration_blocks.slice(
                blockStartingIndex,
                5 + blockStartingIndex
              ),
              page: this.state.currentConfigPage,
              total: this.state.configuration_blocks.length,
            }}
            onTagChange={(field: string, value: string | number) =>
              this.setState(oldState => ({
                tag: { ...oldState.tag, [field]: value },
              }))
            }
            onConfigListChange={(index: number) => {
              this.setState({
                currentConfigPage: index,
              });
            }}
            onConfigAddOrEdit={(block: ConfigurationBlock) => {
              this.setState(previousState => ({
                configuration_blocks: previousState.configuration_blocks.concat([block]),
              }));
            }}
            onConfigRemoved={(block: ConfigurationBlock) => {
              this.setState(previousState => {
                const selectedIndex = previousState.configuration_blocks.findIndex(c => {
                  return isEqual(block, c);
                });
                const blocks = [...previousState.configuration_blocks];
                blocks.splice(selectedIndex, 1);
                return {
                  configuration_blocks: blocks,
                };
              });
            }}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                disabled={
                  this.state.tag.name.search(/^[A-Za-z0-9? ,_-]+$/) === -1 ||
                  this.state.tag.name === '' ||
                  this.getNumExclusiveConfigurationBlocks() > 1 // || this.state.tag.configuration_blocks.length === 0
                }
                onClick={this.saveTag}
              >
                <FormattedMessage
                  id="xpack.beatsManagement.tag.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => this.props.goTo('/overview/configuration_tags')}>
                <FormattedMessage
                  id="xpack.beatsManagement.tag.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PrimaryLayout>
    );
  }

  private saveTag = async () => {
    const newTag = await this.props.containers.tags.upsertTag(this.state.tag);
    if (!newTag) {
      return alert(
        i18n.translate('xpack.beatsManagement.createTag.errorSavingTagTitle', {
          defaultMessage: 'error saving tag',
        })
      );
    }
    const createBlocksResponse = await this.props.libs.configBlocks.upsert(
      this.state.configuration_blocks.map(block => ({ ...block, tag: this.state.tag.id }))
    );
    const creationError = createBlocksResponse.results.reduce(
      (err: string, resp) => (!err ? (err = resp.error ? resp.error.message : '') : err),
      ''
    );
    if (creationError) {
      return alert(creationError);
    }

    this.props.goTo(`/overview/configuration_tags`);
  };
  private getNumExclusiveConfigurationBlocks = () =>
    this.state.configuration_blocks
      .map(({ type }) => UNIQUENESS_ENFORCING_TYPES.some(uniqueType => uniqueType === type))
      .reduce((acc, cur) => (cur ? acc + 1 : acc), 0);
}

export const TagCreatePage = injectI18n(TagCreatePageComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore EuiInMemoryTable typings not yet available
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get } from 'lodash';
import React from 'react';
import { configBlockSchemas } from '../../../common/config_schemas';
import { translateConfigSchema } from '../../../common/config_schemas_translations_map';
import { TABLE_CONFIG } from '../../../common/constants';
import { BeatTag, CMBeat, ConfigurationBlock } from '../../../common/domain_types';
import { Breadcrumb } from '../../components/navigation/breadcrumb';
import { ConnectedLink } from '../../components/navigation/connected_link';
import { TagBadge } from '../../components/tag';
import { ConfigView } from '../../components/tag/config_view/index';
import { AppPageProps } from '../../frontend_types';

interface PageProps extends AppPageProps {
  beat: CMBeat;
  intl: InjectedIntl;
}

interface PageState {
  selectedConfig: ConfigurationBlock | null;
  tags: BeatTag[];
  configuration_blocks: ConfigurationBlock[];
  configurationBlocksPage: number;
}

class BeatDetailPageUi extends React.PureComponent<PageProps, PageState> {
  constructor(props: PageProps) {
    super(props);

    this.state = {
      selectedConfig: null,
      tags: [],
      configuration_blocks: [],
      configurationBlocksPage: 0,
    };
  }

  public async componentWillMount() {
    const tags = await this.props.libs.tags.getTagsWithIds(this.props.beat.tags);
    const blocksResult = await this.props.libs.configBlocks.getForTags(
      this.props.beat.tags,
      this.state.configurationBlocksPage
    );

    this.setState({
      configuration_blocks: blocksResult.list,
      tags,
    });
  }
  public render() {
    const props = this.props;
    const { beat, intl } = props;
    if (!beat) {
      return (
        <FormattedMessage
          id="xpack.beatsManagement.beat.beatNotFoundErrorTitle"
          defaultMessage="Beat not found"
        />
      );
    }
    const configurationBlocks = !this.state.configuration_blocks
      ? []
      : this.state.configuration_blocks.map(configuration => ({
          // @ts-ignore one of the types on ConfigurationBlock doesn't define a "module" property
          module: configuration.config.type || null,
          tagId: configuration.tag,
          tagColor:
            ((this.state.tags || []).find(tag => tag.id === configuration.tag) || ({} as BeatTag))
              .color || 'grey',
          tagName:
            ((this.state.tags || []).find(tag => tag.id === configuration.tag) || ({} as BeatTag))
              .name || configuration.tag,
          ...beat,
          ...configuration,
          displayValue: get(
            translateConfigSchema(configBlockSchemas).find(
              config => config.id === configuration.type
            ),
            'text',
            null
          ),
        }));

    const columns = [
      {
        field: 'displayValue',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.beatConfigurations.typeColumnName',
          defaultMessage: 'Type',
        }),
        sortable: true,
        render: (value: string | null, configuration: any) => (
          <EuiLink
            onClick={() => {
              this.setState({
                selectedConfig: configuration,
              });
            }}
          >
            {value || configuration.type}
          </EuiLink>
        ),
      },
      {
        field: 'module',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.beatConfigurations.moduleColumnName',
          defaultMessage: 'Module',
        }),
        sortable: true,
      },
      {
        field: 'description',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.beatConfigurations.descriptionColumnName',
          defaultMessage: 'Description',
        }),
        sortable: true,
      },
      {
        field: 'tagId',
        name: intl.formatMessage({
          id: 'xpack.beatsManagement.beatConfigurations.tagColumnName',
          defaultMessage: 'Tag',
        }),
        render: (id: string, block: any) => (
          <ConnectedLink path={`/tag/edit/${id}`}>
            <TagBadge
              maxIdRenderSize={TABLE_CONFIG.TRUNCATE_TAG_LENGTH_SMALL}
              tag={{ color: block.tagColor, id, name: block.tagName }}
            />
          </ConnectedLink>
        ),
        sortable: true,
      },
    ];
    return (
      <React.Fragment>
        <Breadcrumb
          title={i18n.translate('xpack.beatsManagement.breadcrumb.beatDetails', {
            defaultMessage: 'Beat details for: {beatId}',
            values: { beatId: beat.id },
          })}
          path={`/beat/${beat.id}/details`}
        />
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="xpack.beatsManagement.beat.detailsConfigurationTitle"
                  defaultMessage="Configurations"
                />
              </h4>
            </EuiTitle>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.beatsManagement.beat.detailsConfigurationDescription"
                  defaultMessage="You can have multiple configurations applied to an individual tag. These configurations can repeat
                    or mix types as necessary. For example, you may utilize three metricbeat configurations alongside one input and
                    filebeat configuration."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiInMemoryTable columns={columns} items={configurationBlocks} />
          </EuiFlexItem>
        </EuiFlexGroup>
        {this.state.selectedConfig && (
          <ConfigView
            configBlock={this.state.selectedConfig}
            onClose={() => this.setState({ selectedConfig: null })}
          />
        )}
      </React.Fragment>
    );
  }
}
export const BeatDetailPage = injectI18n(BeatDetailPageUi);

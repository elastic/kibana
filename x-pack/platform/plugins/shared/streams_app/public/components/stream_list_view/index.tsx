/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiBetaBadge,
  EuiLink,
  useEuiTheme,
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiFlexItem,
  EuiText,
  EuiPanel,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { NotificationsStart, OverlayRef } from '@kbn/core/public';
import { useAbortController } from '@kbn/react-hooks';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { Streams } from '@kbn/streams-schema';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isEmpty } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsTreeTable } from './tree_table';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function StreamListView() {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        share,
      },
    },
    core,
  } = useKibana();
  const onboardingLocator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const handleAddData = onboardingLocator
    ? () => {
        onboardingLocator.navigate({});
      }
    : undefined;

  const { timeState } = useTimefilter();
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    // time state change is used to trigger a refresh of the listed
    // streams metadata but we operate on stale data if we don't
    // also refresh the streams
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, timeState.start, timeState.end]
  );

  const overlayRef = React.useRef<OverlayRef | null>(null);

  function openGroupStreamCreationFlyout(existingStream?: Streams.GroupStream.Definition) {
    overlayRef.current?.close();
    overlayRef.current = core.overlays.openFlyout(
      toMountPoint(
        <GroupStreamCreationFlyout
          client={streamsRepositoryClient}
          streamsList={streamsListFetch.value}
          refresh={() => {
            streamsListFetch.refresh();
            overlayRef.current?.close();
          }}
          notifications={core.notifications}
          exsitingStream={existingStream}
        />,
        core
      ),
      { size: 's' }
    );
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
                  defaultMessage: 'Streams',
                })}
                <EuiBetaBadge
                  label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                    defaultMessage: 'Technical Preview',
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.streams.streamsListView.betaBadgeDescription',
                    {
                      defaultMessage:
                        'This functionality is experimental and not supported. It may change or be removed at any time.',
                    }
                  )}
                  alignment="middle"
                  size="s"
                />
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => openGroupStreamCreationFlyout()}>
                Create group stream
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          <>
            {i18n.translate('xpack.streams.streamsListView.pageHeaderDescription', {
              defaultMessage:
                'Use Streams to organize and process your data into clear structured flows, and simplify routing, field extraction, and retention management.',
            })}{' '}
            <EuiLink target="_blank" href={core.docLinks.links.observability.logsStreams}>
              {i18n.translate('xpack.streams.streamsListView.pageHeaderDocsLink', {
                defaultMessage: 'See docs',
              })}
            </EuiLink>
          </>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        {streamsListFetch.loading && streamsListFetch.value === undefined ? (
          <EuiEmptyPrompt
            icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
            title={
              <h2>
                {i18n.translate('xpack.streams.streamsListView.loadingStreams', {
                  defaultMessage: 'Loading Streams',
                })}
              </h2>
            }
          />
        ) : !streamsListFetch.loading && isEmpty(streamsListFetch.value) ? (
          <StreamsListEmptyPrompt onAddData={handleAddData} />
        ) : (
          <>
            <StreamsTreeTable loading={streamsListFetch.loading} streams={streamsListFetch.value} />
            <GroupStreamsTable
              streams={streamsListFetch.value}
              openGroupStreamCreationFlyout={openGroupStreamCreationFlyout}
            />
          </>
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}

function GroupStreamsTable({
  streams: allStreams,
  openGroupStreamCreationFlyout,
}: {
  streams?: Array<{ stream: Streams.all.Definition }>;
  openGroupStreamCreationFlyout: (stream: Streams.GroupStream.Definition) => void;
}) {
  const router = useStreamsAppRouter();
  const groupStreams = allStreams
    ? allStreams
        .map((stream) => stream.stream)
        .filter((stream): stream is Streams.GroupStream.Definition =>
          Streams.GroupStream.Definition.is(stream)
        )
    : [];

  if (!groupStreams.length) {
    return null;
  }
  const renderLinks = (links: string[]) =>
    links.length
      ? links
          .map((link, idx) => (
            <EuiLink key={idx} href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </EuiLink>
          ))
          .reduce((prev, curr) => (
            <>
              {prev}, {curr}
            </>
          ))
      : 'None';
  // group by category
  const groupedStreams = groupStreams.reduce((acc, stream) => {
    const category = stream.group.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(stream);
    return acc;
  }, {} as Record<string, Streams.GroupStream.Definition[]>);

  // order categories: products, applications, services, infrastructure, orgs, then alphabetical for remaining categories
  const explicitOrder = ['products', 'applications', 'services', 'infrastructure', 'orgs'];
  const allCategories = Object.keys(groupedStreams);
  const orderedCategories = explicitOrder
    .filter((c) => allCategories.includes(c))
    .concat(
      allCategories.filter((c) => !explicitOrder.includes(c)).sort((a, b) => a.localeCompare(b))
    );

  // render each category
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {orderedCategories.map((category) => (
        <EuiFlexItem key={category} grow={false}>
          <EuiText size="m">
            <h2>{category}</h2>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="row" wrap>
            {groupedStreams[category].map((stream) => (
              <EuiPanel
                key={stream.name}
                paddingSize="s"
                css={css`
                  max-width: 300px;
                  position: relative;
                `}
              >
                <EuiButtonIcon
                  iconType="pencil"
                  css={css`
                    position: absolute;
                    top: 5px;
                    right: 5px;
                  `}
                  onClick={() => {
                    openGroupStreamCreationFlyout(stream);
                  }}
                />
                <EuiText size="s">
                  <EuiLink
                    data-test-subj="streamsAppStreamNodeLink"
                    href={router.link('/{key}', { path: { key: stream.name } })}
                  >
                    <h3>{stream.name}</h3>
                  </EuiLink>
                </EuiText>
                <p>{stream.description}</p>
                {/* Add more stream details here */}
                <EuiText size="xs">
                  <p>Owner: {stream.group.owner}</p>
                  <p>Tier: {stream.group.tier}</p>
                  <p>Tags: {stream.group.tags.join(', ')}</p>
                  <p>Runbook Links: {renderLinks(stream.group.runbook_links)}</p>
                  <p>Documentation Links: {renderLinks(stream.group.documentation_links)}</p>
                  <p>Repository Links: {renderLinks(stream.group.repository_links)}</p>
                  <p>{stream.group.relationships.length} relationships</p>
                </EuiText>
              </EuiPanel>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function GroupStreamCreationFlyout({
  client,
  notifications,
  streamsList,
  refresh,
  exsitingStream,
}: {
  client: StreamsRepositoryClient;
  notifications: NotificationsStart;
  streamsList?: Array<{ stream: Streams.all.Definition }>;
  refresh: () => void;
  exsitingStream?: Streams.GroupStream.Definition;
}) {
  const { signal } = useAbortController();
  const [formData, setFormData] = React.useState({
    name: exsitingStream?.name ?? '',
    description: exsitingStream?.description ?? '',
    category: exsitingStream?.group.category ?? '',
    owner: exsitingStream?.group.owner ?? '',
    tier: exsitingStream?.group.tier.toString() ?? '1',
    relationships:
      exsitingStream?.group.relationships.map((relationship) => ({
        label: relationship.name,
      })) ?? [],
  });

  const [selectedTags, setSelectedTags] = React.useState<Array<{ label: string }>>(
    exsitingStream?.group.tags.map((tag) => ({ label: tag })) ?? []
  );
  const [tagsInvalid, setTagsInvalid] = React.useState(false);

  const isValid = (value: string) => /^[a-zA-Z]+$/.test(value);

  const onCreateOption = (searchValue: string) => {
    if (!isValid(searchValue)) {
      return false;
    }
    const newOption = { label: searchValue };
    setSelectedTags([...selectedTags, newOption]);
  };

  const onSearchChange = (searchValue: string) => {
    setTagsInvalid(searchValue ? !isValid(searchValue) : false);
  };

  const onComboChange = (options: Array<{ label: string }>) => {
    setSelectedTags(options);
    setTagsInvalid(false);
  };

  const [selectedRunbookLinks, setSelectedRunbookLinks] = React.useState<Array<{ label: string }>>(
    exsitingStream?.group.runbook_links.map((link) => ({ label: link })) ?? []
  );
  const [selectedDocLinks, setSelectedDocLinks] = React.useState<Array<{ label: string }>>(
    exsitingStream?.group.documentation_links.map((link) => ({ label: link })) ?? []
  );
  const [selectedRepoLinks, setSelectedRepoLinks] = React.useState<Array<{ label: string }>>(
    exsitingStream?.group.repository_links.map((link) => ({ label: link })) ?? []
  );

  const onCreateRunbookOption = (searchValue: string) => {
    const newOption = { label: searchValue };
    setSelectedRunbookLinks([...selectedRunbookLinks, newOption]);
  };

  const onRunbookComboChange = (options: Array<{ label: string }>) => {
    setSelectedRunbookLinks(options);
  };

  const onCreateDocOption = (searchValue: string) => {
    const newOption = { label: searchValue };
    setSelectedDocLinks([...selectedDocLinks, newOption]);
  };

  const onDocComboChange = (options: Array<{ label: string }>) => {
    setSelectedDocLinks(options);
  };

  const onCreateRepoOption = (searchValue: string) => {
    const newOption = { label: searchValue };
    setSelectedRepoLinks([...selectedRepoLinks, newOption]);
  };

  const onRepoComboChange = (options: Array<{ label: string }>) => {
    setSelectedRepoLinks(options);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function createGroupStream() {
    const tags = selectedTags.map((opt) => opt.label);
    const runbookLinks = selectedRunbookLinks.map((opt) => opt.label);
    const documentationLinks = selectedDocLinks.map((opt) => opt.label);
    const repositoryLinks = selectedRepoLinks.map((opt) => opt.label);
    const relationships = formData.relationships.map((r) => ({
      name: r.label as string,
      type: 'member' as const,
      filter: '*',
    }));

    let streamBaseData: any = {};

    if (exsitingStream) {
      streamBaseData = await client.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: formData.name },
        },
        signal,
      });
    }

    client
      .fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: formData.name },
          body: {
            dashboards: [],
            queries: [],
            ...streamBaseData,
            stream: {
              // name: formData.name,
              description: formData.description,
              group: {
                category: formData.category,
                owner: formData.owner,
                tier: parseInt(
                  formData.tier,
                  10
                ) as Streams.GroupStream.Definition['group']['tier'],
                tags,
                runbook_links: runbookLinks,
                documentation_links: documentationLinks,
                repository_links: repositoryLinks,
                relationships,
              },
            },
          },
        },
        signal,
      })
      .then(() => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.streamsListView.createGroupStreamSuccess', {
            defaultMessage: 'Group stream created successfully',
          }),
        });
        refresh();
      })
      .catch((error) => {
        notifications.toasts.addError(error, {
          title: 'Failed to create group stream',
        });
      });
  }

  const streamsOptions = streamsList?.map((stream) => ({
    label: stream.stream.name,
  }));

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create group</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow label="Stream Name" helpText="Enter a unique stream name">
          <EuiFieldText name="name" value={formData.name} onChange={handleInputChange} />
        </EuiFormRow>
        <EuiFormRow label="Description">
          <EuiFieldText
            name="description"
            value={formData.description}
            onChange={handleInputChange}
          />
        </EuiFormRow>
        <EuiFormRow label="Category">
          <EuiComboBox
            placeholder="Select or create a category"
            singleSelection={{ asPlainText: true }}
            options={[
              { label: 'products' },
              { label: 'applications' },
              { label: 'services' },
              { label: 'infrastructure' },
              { label: 'orgs' },
              { label: 'GitHub' },
            ]}
            selectedOptions={formData.category ? [{ label: formData.category }] : []}
            onChange={(selectedOptions) =>
              setFormData({ ...formData, category: selectedOptions[0]?.label || '' })
            }
            onCreateOption={(searchValue) =>
              setFormData({ ...formData, category: searchValue.trim() })
            }
          />
        </EuiFormRow>
        <EuiFormRow label="Owner">
          <EuiFieldText name="owner" value={formData.owner} onChange={handleInputChange} />
        </EuiFormRow>
        <EuiFormRow label="Tier">
          <EuiSelect
            name="tier"
            value={formData.tier}
            onChange={handleInputChange}
            options={[
              { value: '1', text: '1' },
              { value: '2', text: '2' },
              { value: '3', text: '3' },
              { value: '4', text: '4' },
            ]}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Tags"
          helpText="Enter tags (letters only)"
          isInvalid={tagsInvalid}
          error={tagsInvalid ? 'Only letters are allowed' : undefined}
        >
          <EuiComboBox
            noSuggestions
            placeholder="Create some tags (letters only)"
            selectedOptions={selectedTags}
            onCreateOption={onCreateOption}
            onChange={onComboChange}
            onSearchChange={onSearchChange}
            isInvalid={tagsInvalid}
          />
        </EuiFormRow>
        <EuiFormRow label="Runbook Links" helpText="Enter runbook links">
          <EuiComboBox
            noSuggestions
            placeholder="Add runbook links"
            selectedOptions={selectedRunbookLinks}
            onCreateOption={onCreateRunbookOption}
            onChange={onRunbookComboChange}
          />
        </EuiFormRow>
        <EuiFormRow label="Documentation Links" helpText="Enter documentation links">
          <EuiComboBox
            noSuggestions
            placeholder="Add documentation links"
            selectedOptions={selectedDocLinks}
            onCreateOption={onCreateDocOption}
            onChange={onDocComboChange}
          />
        </EuiFormRow>
        <EuiFormRow label="Repository Links" helpText="Enter repository links">
          <EuiComboBox
            noSuggestions
            placeholder="Add repository links"
            selectedOptions={selectedRepoLinks}
            onCreateOption={onCreateRepoOption}
            onChange={onRepoComboChange}
          />
        </EuiFormRow>
        <EuiFormRow label="Relationships">
          <EuiComboBox
            placeholder="Select relationships"
            options={streamsOptions}
            selectedOptions={formData.relationships}
            onChange={(options) => {
              setFormData({ ...formData, relationships: options });
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButton onClick={createGroupStream} fill>
          Create
        </EuiButton>
      </EuiModalBody>
    </>
  );
}

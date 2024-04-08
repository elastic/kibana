/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexItem,
  EuiTitle,
  EuiSuperSelect,
  EuiText,
  EuiLink,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import {
  ElasticsearchModelDefaultOptions,
  ElasticsearchModelDescriptions,
  ElasticsearchService,
  ModelConfig,
  Service,
} from '../types';
import { DocumentationProps, saveMappingOnClick } from './inference_flyout_wrapper';
import { elasticsearchModelsOptions, setModalConfigResponse } from '../lib/shared_values';
import { ServiceOptions } from './service_options';
import { InferenceFlyout } from './flyout_layout';
interface ElasticsearchModelsProps
  extends Omit<DocumentationProps, 'supportedNlpModels' | 'nlpImportModel'>,
    saveMappingOnClick {
  description: string;
}
export const ElasticsearchModels: React.FC<ElasticsearchModelsProps> = ({
  description,
  elserv2documentationUrl = '',
  e5documentationUrl = '',
  onSaveInferenceEndpoint,
}) => {
  const [selectedModelType, setSelectedModelType] = useState(elasticsearchModelsOptions[0].value);
  const [numberOfAllocations, setNumberOfAllocations] = useState<number>(1);
  const [numberOfThreads, setNumberOfThreads] = useState<number>(1);

  const serviceType: Service = useMemo(() => {
    const serviceType =
      selectedModelType === ElasticsearchModelDefaultOptions.elser
        ? Service.elser
        : Service.elasticsearch;
    return serviceType;
  }, [selectedModelType]);

  const modelConfig: ModelConfig = useMemo(() => {
    const modelAllocationsAndThreads = {
      num_allocations: numberOfAllocations,
      num_threads: numberOfThreads,
    };
    if (serviceType === Service.elser)
      return setModalConfigResponse(serviceType, {
        ...modelAllocationsAndThreads,
      });
    else {
      return setModalConfigResponse(serviceType, {
        ...modelAllocationsAndThreads,
        model_id: ElasticsearchModelDefaultOptions.e5,
      } as ElasticsearchService);
    }
  }, [numberOfAllocations, numberOfThreads, serviceType]);

  const elasticSearchModelTypesDescriptions: Record<
    ElasticsearchModelDefaultOptions,
    ElasticsearchModelDescriptions
  > = {
    [ElasticsearchModelDefaultOptions.elser]: {
      description: i18n.translate(
        'xpack.ml.addInferenceEndpoint.elasticsearchModels.elser.description',
        {
          defaultMessage:
            "ELSER is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform.",
        }
      ),
      documentation: elserv2documentationUrl,
      title: i18n.translate('xpack.ml.addInferenceEndpoint.elasticsearchModels.elser.title', {
        defaultMessage: 'Elastic Learned Sparse Encoder v2',
      }),
    },
    [ElasticsearchModelDefaultOptions.e5]: {
      description: i18n.translate(
        'xpack.ml.addInferenceEndpoint.elasticsearchModels.e5Model.description',
        {
          defaultMessage:
            'E5 is a third party NLP model that enables you to perform multi-lingual semantic search by using dense vector representations. This model performs best for non-English language documents and queries.',
        }
      ),
      documentation: e5documentationUrl,

      title: i18n.translate('xpack.ml.addInferenceEndpoint.e5Model.title', {
        defaultMessage: 'Multilingual E5 (Embeddings from bidirectional encoder representations)',
      }),
    },
  };

  const inferenceComponent = (
    <>
      <EuiFlexItem grow={false}>
        <EuiSuperSelect
          fullWidth
          options={elasticsearchModelsOptions}
          valueOfSelected={selectedModelType}
          onChange={(value) => setSelectedModelType(value)}
        />
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h6>
            <FormattedMessage
              id="xpack.ml.inferenceFlyoutWrapper.elasticsearchModels.modelDescription"
              defaultMessage="{title}"
              values={{
                title: elasticSearchModelTypesDescriptions[selectedModelType].title,
              }}
            />
          </h6>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.ml.inferenceFlyoutWrapper.elasticsearchModels.modelDescription"
            defaultMessage="{description}"
            values={{
              description: elasticSearchModelTypesDescriptions[selectedModelType].description,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <p>
          <EuiLink
            href={elasticSearchModelTypesDescriptions[selectedModelType].documentation}
            external
            target={'_blank'}
          >
            <FormattedMessage
              id="xpack.ml.inferenceFlyoutWrapper.elasticsearchModels.modelDocumentation"
              defaultMessage="View documentation"
            />
          </EuiLink>
        </p>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <ServiceOptions
          id={useGeneratedHtmlId({ prefix: 'serviceOptions' })}
          numberOfAllocations={numberOfAllocations}
          setNumberOfAllocations={setNumberOfAllocations}
          setNumberOfThreads={setNumberOfThreads}
          numberOfThreads={numberOfThreads}
        />
      </EuiFlexItem>
    </>
  );
  return (
    <>
      <InferenceFlyout
        description={description}
        service={serviceType}
        onSaveInferenceEndpoint={onSaveInferenceEndpoint}
        inferenceComponent={inferenceComponent}
        modelConfig={modelConfig}
        isSaveButtonEmpty={false}
      />
    </>
  );
};

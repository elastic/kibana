/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferResponse } from '../inference_base';
import { getGeneralInputComponent } from '../text_input';
import { getNerOutputComponent } from './ner_output';

export type FormattedNerResponse = Array<{
  value: string;
  entity: estypes.MlTrainedModelEntities | null;
}>;

export type NerResponse = InferResponse<FormattedNerResponse, estypes.MlInferTrainedModelResponse>;

export class NerInference extends InferenceBase<NerResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.NER;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.ner.label',
    { defaultMessage: 'Named entity recognition' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.ner.info1', {
      defaultMessage: 'Test how well the model identifies named entities in your input text.',
    }),
  ];

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig,
    inputType: INPUT_TYPE,
    deploymentId: string
  ) {
    super(trainedModelsApi, model, inputType, deploymentId);

    this.initialize();
  }

  protected async inferText() {
    return this.runInfer<estypes.MlInferTrainedModelResponse>(
      () => {},
      (resp, inputText) => {
        return {
          response: parseResponse(resp),
          rawResponse: resp,
          inputText,
        };
      }
    );
  }

  protected async inferIndex() {
    return this.runPipelineSimulate((doc) => {
      return {
        response: parseResponse({ inference_results: [doc._source[this.inferenceType]] }),
        rawResponse: doc._source[this.inferenceType],
        inputText: doc._source[this.getInputField()],
      };
    });
  }

  protected getProcessors() {
    return this.getBasicProcessors();
  }

  public getInputComponent(): JSX.Element | null {
    if (this.inputType === INPUT_TYPE.TEXT) {
      const placeholder = i18n.translate('xpack.ml.trainedModels.testModelsFlyout.ner.inputText', {
        defaultMessage: 'Enter a phrase to test',
      });
      return getGeneralInputComponent(this, placeholder);
    } else {
      return null;
    }
  }

  public getOutputComponent(): JSX.Element {
    return getNerOutputComponent(this);
  }
}

function parseResponse(resp: estypes.MlInferTrainedModelResponse): FormattedNerResponse {
  const [{ predicted_value: predictedValue, entities }] = resp.inference_results;
  const splitWordsAndEntitiesRegex = /(\[.*?\]\(.*?&.*?\))/;
  const matchEntityRegex = /(\[.*?\])\((.*?)&(.*?)\)/;
  if (predictedValue === undefined || entities === undefined) {
    return [];
  }

  const sentenceChunks = (predictedValue as unknown as string).split(splitWordsAndEntitiesRegex);
  let count = 0;
  return sentenceChunks.map((chunk) => {
    const matchedEntity = chunk.match(matchEntityRegex);
    if (matchedEntity) {
      const entityValue = matchedEntity[3];
      const entity = entities[count];
      if (entityValue !== entity.entity && entityValue.replaceAll('+', ' ') !== entity.entity) {
        // entityValue may not equal entity.entity if the entity is comprised of
        // two words as they are joined with a plus symbol
        // Replace any plus symbols and check again. If they still don't match, log an error

        // eslint-disable-next-line no-console
        console.error('mismatch entity', entity);
      }
      count++;
      return { value: entity.entity, entity };
    }
    return { value: chunk, entity: null };
  });
}

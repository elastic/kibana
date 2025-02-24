/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { INPUT_TYPE } from '../inference_base';
import { InferenceBase } from '../inference_base';
import { processInferenceResult, processResponse } from './common';
import type { TextClassificationResponse, RawTextClassificationResponse } from './common';

import { getZeroShotClassificationInput } from './zero_shot_classification_input';
import { getTextClassificationOutputComponent } from './text_classification_output';

export class ZeroShotClassificationInference extends InferenceBase<TextClassificationResponse> {
  protected inferenceType = SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION;
  protected inferenceTypeLabel = i18n.translate(
    'xpack.ml.trainedModels.testModelsFlyout.zeroShotClassification.label',
    { defaultMessage: 'Zero shot classification' }
  );
  protected info = [
    i18n.translate('xpack.ml.trainedModels.testModelsFlyout.zeroShotClassification.info1', {
      defaultMessage:
        'Provide a set of labels and test how well the model classifies your input text.',
    }),
  ];

  private labelsText$ = new BehaviorSubject<string>('');
  private multiLabel$ = new BehaviorSubject<boolean>(false);

  constructor(
    trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>,
    model: estypes.MlTrainedModelConfig,
    inputType: INPUT_TYPE,
    deploymentId: string
  ) {
    super(trainedModelsApi, model, inputType, deploymentId);

    this.initialize(
      [this.labelsText$.pipe(map((labelsText) => labelsText !== ''))],
      [this.labelsText$, this.multiLabel$]
    );
  }

  public async inferText() {
    return this.runInfer<RawTextClassificationResponse>(
      () => {
        const labelsText = this.labelsText$.getValue();
        const multiLabel = this.multiLabel$.getValue();
        const inputLabels = labelsText?.split(',').map((l) => l.trim());
        return this.getInferenceConfig({
          labels: inputLabels,
          multi_label: multiLabel,
        } as estypes.MlZeroShotClassificationInferenceUpdateOptions);
      },
      (resp, inputText) => {
        return processResponse(resp, this.model, inputText);
      }
    );
  }

  protected async inferIndex() {
    return this.runPipelineSimulate((doc) => {
      return {
        response: processInferenceResult(doc._source[this.inferenceType], this.model),
        rawResponse: doc._source[this.inferenceType],
        inputText: doc._source[this.getInputField()],
      };
    });
  }

  private getInputLabels() {
    const labelsText = this.labelsText$.getValue();
    return labelsText?.split(',').map((l) => l.trim());
  }

  protected getProcessors() {
    const inputLabels = this.getInputLabels();
    const multiLabel = this.multiLabel$.getValue();
    return this.getBasicProcessors({
      labels: inputLabels,
      multi_label: multiLabel,
    } as estypes.MlZeroShotClassificationInferenceUpdateOptions);
  }

  public setLabelsText(text: string) {
    this.labelsText$.next(text);
  }

  public getLabelsText$() {
    return this.labelsText$.asObservable();
  }

  public getLabelsText() {
    return this.labelsText$.getValue();
  }

  public setMultiLabel(multiLabel: boolean) {
    this.multiLabel$.next(multiLabel);
  }

  public getMultiLabel$() {
    return this.multiLabel$.asObservable();
  }
  public getMultiLabel() {
    return this.multiLabel$.getValue();
  }

  public getInputComponent(): JSX.Element {
    const placeholder = i18n.translate(
      'xpack.ml.trainedModels.testModelsFlyout.zeroShotClassification.inputText',
      {
        defaultMessage: 'Enter a phrase to test',
      }
    );
    return getZeroShotClassificationInput(this, placeholder);
  }

  public getOutputComponent(): JSX.Element {
    return getTextClassificationOutputComponent(this);
  }
}

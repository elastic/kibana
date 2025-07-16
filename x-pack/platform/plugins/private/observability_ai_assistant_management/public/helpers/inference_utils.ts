import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  LEGACY_CUSTOM_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';

export function getMappedInferenceId(currentInferenceId: string | undefined): string | undefined {
  if (currentInferenceId === LEGACY_CUSTOM_INFERENCE_ID) {
    return ELSER_ON_ML_NODE_INFERENCE_ID;
  }
  return currentInferenceId;
}

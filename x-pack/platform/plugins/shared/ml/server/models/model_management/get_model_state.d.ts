import { type ModelState } from '@kbn/ml-trained-models-utils';
import type { NLPModelItem } from '@kbn/ml-common-types/trained_models';
/**
 * Resolves result model state based on the state of each deployment.
 *
 * If at least one deployment is in the STARTED state, the model state is STARTED.
 * Then if none of the deployments are in the STARTED state, but at least one is in the STARTING state, the model state is STARTING.
 * If all deployments are in the STOPPING state, the model state is STOPPING.
 */
export declare const getModelDeploymentState: (model: NLPModelItem) => ModelState | undefined;

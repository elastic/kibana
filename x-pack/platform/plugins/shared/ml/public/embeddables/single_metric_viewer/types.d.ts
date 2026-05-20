import type { MlEntityField } from '@kbn/ml-anomaly-utils';
export type MlEntity = Record<string, MlEntityField['fieldValue']>;

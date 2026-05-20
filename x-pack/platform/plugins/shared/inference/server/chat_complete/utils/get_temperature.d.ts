import type { InferenceConnector } from '@kbn/inference-common';
export declare const getTemperatureIfValid: (temperature?: number, { connector, modelName }?: {
    connector?: InferenceConnector;
    modelName?: string;
}) => {
    temperature: number;
} | {
    temperature?: undefined;
};

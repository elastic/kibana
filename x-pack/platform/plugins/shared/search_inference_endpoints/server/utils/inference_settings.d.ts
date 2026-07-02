import type { SavedObject } from '@kbn/core/server';
import type { InferenceSettingsAttributes, InferenceSettingsResponse } from '../../common/types';
export declare const parseInferenceSettingsSO: (so: SavedObject<InferenceSettingsAttributes>) => InferenceSettingsResponse;
export declare const validateInferenceSettings: (attrs: InferenceSettingsAttributes) => string[];

import type { SUPPORTED_FIELD_TYPES } from '../constants';
export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[keyof typeof SUPPORTED_FIELD_TYPES];

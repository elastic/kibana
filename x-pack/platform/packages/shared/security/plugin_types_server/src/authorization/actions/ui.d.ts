import type { Capabilities as UICapabilities } from '@kbn/core/server';
export interface UIActions {
    get(featureId: keyof UICapabilities, ...uiCapabilityParts: string[]): string;
}

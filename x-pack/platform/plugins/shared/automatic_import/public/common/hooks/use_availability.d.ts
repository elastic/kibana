import type { RenderUpselling } from '../../services/types';
export interface Availability {
    hasLicense: boolean;
    renderUpselling: RenderUpselling | undefined;
}
export declare const useAvailability: () => Availability;
export declare const useIsAvailable: () => boolean;

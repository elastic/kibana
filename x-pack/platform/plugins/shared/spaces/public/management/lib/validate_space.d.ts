import type { CustomizeSpaceFormValues } from '../types';
interface SpaceValidatorOptions {
    shouldValidate?: boolean;
}
export declare class SpaceValidator {
    private shouldValidate;
    constructor(options?: SpaceValidatorOptions);
    enableValidation(): void;
    disableValidation(): void;
    validateSpaceName(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateSpaceDescription(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateURLIdentifier(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateAvatarInitials(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateAvatarColor(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateAvatarImage(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateSolutionView(space: CustomizeSpaceFormValues, isEditing: boolean, allowSolutionVisibility?: boolean): {
        isInvalid: boolean;
    };
    validateEnabledFeatures(space: CustomizeSpaceFormValues): {
        isInvalid: boolean;
    };
    validateForSave(space: CustomizeSpaceFormValues, isEditing: boolean, allowSolutionVisibility: boolean): {
        isInvalid: boolean;
    };
}
export {};

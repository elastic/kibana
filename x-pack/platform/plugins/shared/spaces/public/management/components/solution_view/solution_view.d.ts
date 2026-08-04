import type { FunctionComponent } from 'react';
import type { SpaceValidator } from '../../lib';
import type { CustomizeSpaceFormValues } from '../../types';
interface Props {
    space: CustomizeSpaceFormValues;
    onChange: (space: CustomizeSpaceFormValues) => void;
    isEditing: boolean;
    validator: SpaceValidator;
    sectionTitle?: string;
}
export declare const SolutionView: FunctionComponent<Props>;
export {};

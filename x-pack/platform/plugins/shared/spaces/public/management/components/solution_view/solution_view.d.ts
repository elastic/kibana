import type { FunctionComponent } from 'react';
import type { Space } from '../../../../common';
import type { SpaceValidator } from '../../lib';
interface Props {
    space: Partial<Space>;
    onChange: (space: Partial<Space>) => void;
    isEditing: boolean;
    validator: SpaceValidator;
    sectionTitle?: string;
}
export declare const SolutionView: FunctionComponent<Props>;
export {};

import type { FunctionComponent } from 'react';
import type { Space } from '../../../../common';
import type { SpacesManager } from '../../../spaces_manager';
interface Props {
    space: Space;
    spacesManager: SpacesManager;
    onCancel(): void;
    onSuccess?(): void;
}
export declare const ConfirmDeleteModal: FunctionComponent<Props>;
export {};

import type { Space } from '../../common';
/**
 * Values used in the "Customize Space" form
 */
export interface CustomizeSpaceFormValues extends Partial<Space> {
    customIdentifier?: boolean;
    avatarType?: 'initials' | 'image';
    customAvatarInitials?: boolean;
    customAvatarColor?: boolean;
}

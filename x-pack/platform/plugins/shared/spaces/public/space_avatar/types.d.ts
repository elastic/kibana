import type { Space } from '../../common';
/**
 * Properties for the SpaceAvatar component.
 */
export interface SpaceAvatarProps {
    /** The space to represent with an avatar. */
    space: Partial<Space>;
    /** The size of the avatar. */
    size?: 's' | 'm' | 'l' | 'xl';
    /** Optional CSS class(es) to apply. */
    className?: string;
    /**
     * When enabled, allows EUI to provide an aria-label for this component, which is announced on screen readers.
     *
     * Default value is true.
     */
    announceSpaceName?: boolean;
    /**
     * Whether or not to render the avatar in a disabled state.
     *
     * Default value is false.
     */
    isDisabled?: boolean;
    /**
     * Callback to be invoked when the avatar is clicked.
     */
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    /**
     * Callback to be invoked when the avatar is clicked via keyboard.
     */
    onKeyPress?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    /**
     * Style props for the avatar.
     */
    style?: React.CSSProperties;
}

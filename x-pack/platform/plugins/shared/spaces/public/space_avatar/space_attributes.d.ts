import type { SpaceAvatarTarget } from './types';
/**
 * Determines the color for the provided space.
 * If a color is present on the Space itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the space name.
 *
 * @param {SpaceAvatarTarget} space the space.
 */
export declare function getSpaceColor(space?: SpaceAvatarTarget): string;
/**
 * Determines the initials for the provided space.
 * If initials are present on the Space itself, then that is used.
 * Otherwise, the initials are calculated based off the words in the space name, with a max length of 2 characters.
 *
 * @param {SpaceAvatarTarget} space the space.
 */
export declare function getSpaceInitials(space?: SpaceAvatarTarget): string;
/**
 * Determines the avatar image for the provided space.
 *
 * @param {SpaceAvatarTarget} space the space.
 */
export declare function getSpaceImageUrl(space?: SpaceAvatarTarget): string;

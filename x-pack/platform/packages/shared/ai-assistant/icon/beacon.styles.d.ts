import type { AssistantBeaconProps } from './beacon';
export declare const useBeaconSize: (iconSize?: AssistantBeaconProps["size"]) => {
    rootSize: number;
    ringSize: number;
    maskPoint: number;
};
/**
 * Returns contextually-relevant styles for the AI Assistant beacon.
 */
export declare const useStyles: ({ backgroundColor, size: iconSize, ringsColor, }: AssistantBeaconProps) => {
    root: import("@emotion/react").SerializedStyles;
    rings: import("@emotion/react").SerializedStyles;
};

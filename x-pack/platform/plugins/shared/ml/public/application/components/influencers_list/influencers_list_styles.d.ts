import { type MlSeverityType } from '@kbn/ml-anomaly-utils';
export declare const useInfluencersListStyles: () => {
    influencersList: import("@emotion/react").SerializedStyles;
    fieldLabel: import("@emotion/react").SerializedStyles;
    progressBar: import("@emotion/react").SerializedStyles;
    progressColor: (severity: MlSeverityType) => string;
    influencerBadgeBackgroundColor: (severity: MlSeverityType) => string;
    influencerBadgeTextColor: (severity: MlSeverityType) => import("@emotion/react").SerializedStyles;
};

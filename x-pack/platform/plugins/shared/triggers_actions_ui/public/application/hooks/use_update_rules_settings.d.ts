import type { RulesSettingsProperties } from '@kbn/alerting-plugin/common';
interface UseUpdateRuleSettingsProps {
    onClose: () => void;
    onSave?: () => void;
    setUpdatingRulesSettings?: (isUpdating: boolean) => void;
}
export declare const useUpdateRuleSettings: (props: UseUpdateRuleSettingsProps) => import("@tanstack/react-query").UseMutationResult<((import("@kbn/alerting-types").RulesSettingsFlappingProperties & import("@kbn/alerting-types").RulesSettingsModificationMetadata) | (import("@kbn/alerting-types").RulesSettingsQueryDelayProperties & import("@kbn/alerting-types").RulesSettingsModificationMetadata))[], unknown, RulesSettingsProperties, undefined>;
export {};

import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../../routes/types';
export declare const createKiIdentificationManagementSkill: ({ getScopedClients, telemetry, }: {
    getScopedClients: GetScopedClients;
    telemetry: EbtTelemetryClient;
}) => import("@kbn/agent-builder-server/skills/type_definition").SkillDefinition<"ki-identification-management", "skills/platform/streams">;

import React from 'react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import type { Control } from 'react-hook-form';
import type { AgentFormData } from '../agent_form';
interface SkillsTabProps {
    control: Control<AgentFormData>;
    skills: PublicSkillSummary[];
    isLoading: boolean;
    isFormDisabled: boolean;
    areElasticCapabilitiesEnabled: boolean;
}
export declare const SkillsTab: React.FC<SkillsTabProps>;
export {};

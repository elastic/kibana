import React from 'react';
import type { TaskTypeOption } from '../utils/helpers';
interface TaskTypeSelectFieldProps {
    taskType: string;
    taskTypeOptions: TaskTypeOption[];
    onTaskTypeOptionsSelect: (taskType: string) => void;
    isEdit?: boolean;
}
export declare const TaskTypeSelectField: React.FC<TaskTypeSelectFieldProps>;
export {};

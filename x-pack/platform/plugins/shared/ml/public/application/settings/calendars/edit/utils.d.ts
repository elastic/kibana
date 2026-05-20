import type { MlApi } from '../../../services/ml_api_service';
export declare function getCalendarSettingsData(mlApi: MlApi): Promise<unknown>;
export declare function validateCalendarId(calendarId: string): boolean;
export declare function generateTempId(): string;

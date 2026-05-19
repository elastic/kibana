interface DataViewCreated {
    id: string;
}
interface DataViewError {
    id: string;
    error: any;
}
export interface CreateDataViewApiResponseSchema {
    dataViewsCreated: DataViewCreated[];
    dataViewsErrors: DataViewError[];
}
export {};

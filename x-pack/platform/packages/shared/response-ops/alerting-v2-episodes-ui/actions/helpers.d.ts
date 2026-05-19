export declare const uniqueByGroup: <T extends {
    group_hash: string;
}>(items: T[]) => T[];
export declare const successOrPartialToast: (processed: number, total: number) => {
    title: string;
    color: "success" | "warning";
};

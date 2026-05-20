import { Subscription } from 'rxjs';
export declare abstract class StateService {
    private subscriptions$;
    protected _init(): void;
    /**
     * Should return all active subscriptions.
     * @protected
     */
    protected abstract _initSubscriptions(): Subscription;
    destroy(): void;
}

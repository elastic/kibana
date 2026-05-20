import type { OperatorFunction, PartialObserver, Subscription } from 'rxjs';
import type { Observable } from 'rxjs';
export declare const useLatest: <Value>(value: Value) => import("react").MutableRefObject<Value>;
export declare const useObservable: <OutputValue, OutputObservable extends Observable<OutputValue>, InputValues extends Readonly<any[]>>(createObservableOnce: (inputValues: Observable<InputValues>) => OutputObservable, inputValues: InputValues) => OutputObservable;
export declare const useBehaviorSubject: <InputValue, OutputValue, OutputObservable extends Observable<OutputValue>>(deriveObservableOnce: (input$: Observable<InputValue>) => OutputObservable, createInitialValue: () => InputValue) => readonly [OutputObservable, (value: InputValue) => void];
export declare const useObservableState: <State, InitialState>(state$: Observable<State>, initialState: InitialState | (() => InitialState)) => {
    latestValue: State | InitialState;
    latestError: unknown;
};
export declare const useSubscription: <InputValue>(input$: Observable<InputValue>, { next, error, complete, unsubscribe }: PartialObserver<InputValue> & {
    unsubscribe?: () => void;
}) => Subscription | undefined;
export declare const useOperator: <InputValue, OutputValue>(input$: Observable<InputValue>, operator: OperatorFunction<InputValue, OutputValue>) => Observable<OutputValue>;
export declare const tapUnsubscribe: (onUnsubscribe: () => void) => <T>(source$: Observable<T>) => Observable<T>;

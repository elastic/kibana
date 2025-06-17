import { BehaviorSubject, ReplaySubject } from "rxjs";
import { takeUntil } from 'rxjs';
import { Conversation } from '@kbn/elastic-assistant';
import { UnmountCallback } from "@kbn/core/packages/mount-utils/browser";

export type AugmentMessageCodeBlocks = {
    mount: (args: {
        currentConversation: Conversation,
        showAnonymizedValues: boolean
    }) => UnmountCallback
}

const defaultValue: AugmentMessageCodeBlocks = {
    mount: () => () => {}
};

export class AugmentMessageCodeBlocksService {
    private readonly stop$ = new ReplaySubject<void>(1);

    public start() {
        const augmentMessageCodeBlocks$ = new BehaviorSubject<AugmentMessageCodeBlocks>(defaultValue);

        return {
            registerAugmentMessageCodeBlocks: (augmentMessageCodeBlocks: AugmentMessageCodeBlocks) => {
                augmentMessageCodeBlocks$.next(augmentMessageCodeBlocks);
                return () => {
                    augmentMessageCodeBlocks$.next(defaultValue);
                }
            },

            getAugmentMessageCodeBlocks$: () =>
                augmentMessageCodeBlocks$.pipe(
                    takeUntil(this.stop$)
                ),
        };
    }

    public stop() {
        this.stop$.next();
    }
}
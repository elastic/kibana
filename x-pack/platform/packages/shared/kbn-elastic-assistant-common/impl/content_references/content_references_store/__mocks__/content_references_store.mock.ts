import { ContentReferencesStore } from "../../types";

export const contentReferencesStoreFactoryMock: () => ContentReferencesStore = jest
  .fn()
  .mockReturnValue({
    add: jest.fn().mockImplementation((creator: Parameters<ContentReferencesStore['add']>[0]) => {
      return creator({ id: 'exampleContentReferenceId' });
    }),
    getStore: jest.fn().mockReturnValue({}),
  });

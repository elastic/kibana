import { TypedInterrupts } from "../schemas";

/**
 * typedInterrupt function
 */
export const typedInterrupt = <
  T extends keyof TypedInterrupts
>(
  interruptValue: { type: T } & TypedInterrupts[T]["interruptValue"],
): TypedInterrupts[T]['resumeValue'] => {
  if (typeof window !== 'undefined') {
    throw new Error('typedInterrupt is only available on the server side');
  }

  const { interrupt } = eval('require')("@langchain/langgraph");
  const result = interrupt(interruptValue);

  const resumeSchema = TypedInterrupts.shape[interruptValue.type].shape.resumeValue;

  const parsedResult = resumeSchema.safeParse(result);
  if (!parsedResult.success) {
    throw new Error(
      `Resume value did not match schema: ${JSON.stringify(parsedResult.error)}`
    );
  }
  return parsedResult.data;
};

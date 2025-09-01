import { InterruptType, InterruptValue, InterruptResumeValue } from "../schemas";

/**
 * typedInterrupt function
 */
export const typedInterrupt = <
  T extends InterruptType
>(
  interruptValue: { type: T } & InterruptValue,
): {type: T} & InterruptResumeValue => {
  if (typeof window !== 'undefined') {
    throw new Error('typedInterrupt is only available on the server side');
  }

  const { interrupt } = eval('require')("@langchain/langgraph");
  const result = interrupt(interruptValue);

  const parsedResult = InterruptResumeValue.safeParse(result);
  if (!parsedResult.success) {
    throw new Error(
      `Resume value did not match schema: ${JSON.stringify(parsedResult.error)}`
    );
  }

  if(parsedResult.data.type !== interruptValue.type){
    throw new Error(`Resume value type mismatch: expected ${interruptValue.type}, got ${parsedResult.data.type}`);
  }

  return parsedResult.data as {type: T} & InterruptResumeValue;
};

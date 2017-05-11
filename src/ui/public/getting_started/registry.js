import uuid from 'node-uuid';

// This message will go in to the top message section of the Getting Started page
let topMessage = null;

// These messages will go in the Manage and Monitor section of the Getting Started page
const manageAndMonitorMessages = [];

/**
 * Sets the top message on the Getting Started page. This may be used by plugins (such as x-pack) to
 * inject a welcome message or a warning message that they want first-time users to see.
 *
 * NOTE: There is only *one* top message, so the latest invocation of this function will win and its
 * message will "win".
 *
 * @param {string} message Top message string
 */
export function setTopMessage(message) {
  topMessage = message.trim();
}

/**
 * Unsets the top message on the Getting Started page
 */
export function unsetTopMessage() {
  topMessage = null;
}

/**
 * Returns the top message
 *
 * @return {string} top message
 */
export function getTopMessage() {
  return topMessage;
}

/**
 * Adds a message to the Manage and Monitor section of the Getting Started page
 *
 * @param {string} message Message string
 * @return {string} And ID for the message that was added. This can be used later to remove the message.
 */
export function addManageAndMonitorMessage(message) {
  const id = uuid.v1();

  manageAndMonitorMessages.push({
    id,
    message: message.trim()
  });

  return id;
}

/**
 * Removes the specified message from the Manage and Monitor section of the Getting Started page
 *
 * @param {string} id ID of the message to be removed
 * @throws Error if message with specified ID is not found
 */
export function removeManageAndMonitorMessage(id) {
  const messageIndex = this._manageAndMonitorMessages.findIndex(item => item.id === id);

  if (!messageIndex) {
    throw new Error(`No message with id = ${id} found`);
  }

  manageAndMonitorMessages.splice(messageIndex, 1);
}

/**
 * Returns a list of messages for the Manage and Monitor section of the Getting Started page
 *
 * @return {Array[string]} List of messages
 */
export function getManageAndMonitorMessages() {
  return manageAndMonitorMessages.map(messageObj => messageObj.message);
}

import groovy.transform.Field

public static @Field JENKINS_BUILD_STATE = [:]

def add(key, value) {
  if (!buildState.JENKINS_BUILD_STATE.containsKey(key)) {
    buildState.JENKINS_BUILD_STATE[key] = value
    return true
  }

  return false
}

def set(key, value) {
  buildState.JENKINS_BUILD_STATE[key] = value
}

def get(key) {
  return buildState.JENKINS_BUILD_STATE[key]
}

def has(key) {
  return buildState.JENKINS_BUILD_STATE.containsKey(key)
}

def get() {
  return buildState.JENKINS_BUILD_STATE
}

return this
